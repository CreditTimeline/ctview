import 'zod-openapi';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import type { AppDatabase } from '../db/client.js';
import type { CreditFile } from '../types/canonical.js';
import type { QualityWarning } from './quality-warnings.js';
import { validateCreditFile } from '../validation/validator.js';
import { checkReferentialIntegrity } from '../validation/referential-checks.js';
import { computePayloadHash } from './transforms.js';
import { generateQualityWarnings } from './quality-warnings.js';
import { ingestReceipt } from '../schema/sqlite/index.js';
import type { IngestContext } from './ingest-context.js';
import { runAnomalyRules } from '../analysis/engine.js';
import { defaultRules } from '../analysis/registry.js';
import { loadAnomalyConfig } from '../analysis/config.js';
import type { AnalysisEngineResult } from '../analysis/types.js';
import { noopLogger, type Logger } from '../logger.js';

// Inserters — ordered by FK dependency graph
import {
  insertSubject,
  insertCreditFile,
  insertImportBatches,
  insertRawArtifacts,
} from './inserters/provenance.js';
import {
  insertPersonNames,
  insertSubjectIdentifiers,
  insertAddresses,
  insertAddressAssociations,
  insertAddressLinks,
  insertFinancialAssociates,
  insertElectoralRollEntries,
} from './inserters/identity.js';
import { insertOrganisations, insertTradelines } from './inserters/tradelines.js';
import {
  insertSearchRecords,
  insertCreditScores,
  insertPublicRecords,
  insertNoticesOfCorrection,
  insertPropertyRecords,
  insertGoneAwayRecords,
  insertFraudMarkers,
  insertAttributableItems,
  insertDisputes,
} from './inserters/records.js';
import { insertQualityWarnings } from './inserters/insights.js';
import { insertIngestReceipt, insertAuditLogEntry } from './inserters/app.js';

export const ingestResultSchema = z
  .object({
    success: z.boolean(),
    importIds: z.array(z.string()),
    errors: z.array(z.string()).optional(),
    warnings: z.array(z.unknown()).optional(),
    duplicate: z.boolean().optional(),
    receiptId: z.string().optional(),
    durationMs: z.number().optional(),
    summary: z.record(z.string(), z.number()).optional(),
    analysisResult: z.unknown().optional(),
  })
  .meta({ id: 'IngestResult' });

export interface IngestResult {
  success: boolean;
  importIds: string[];
  errors?: string[];
  warnings?: QualityWarning[];
  duplicate?: boolean;
  receiptId?: string;
  durationMs?: number;
  summary?: Record<string, number>;
  analysisResult?: AnalysisEngineResult;
}

export async function ingestCreditFile(
  db: AppDatabase,
  data: unknown,
  logger?: Logger,
): Promise<IngestResult> {
  const log = logger ?? noopLogger;
  const startTime = performance.now();

  // Step 1: JSON Schema validation
  const schemaResult = validateCreditFile(data);
  if (!schemaResult.valid) {
    log.warn(
      { errorCount: schemaResult.errors?.length ?? 0 },
      'schema validation failed',
    );
    return {
      success: false,
      importIds: [],
      errors: schemaResult.errors?.map((e) => `${e.instancePath}: ${e.message}`) ?? [
        'Unknown validation error',
      ],
    };
  }

  // Safe to cast after Ajv validation passes — structure is schema-conformant
  const file = data as CreditFile;

  // Step 2: Referential integrity checks
  const refResult = checkReferentialIntegrity(file);
  if (!refResult.valid) {
    return { success: false, importIds: [], errors: refResult.errors };
  }

  // Step 3: Compute SHA-256 hash for dedup
  const payloadHash = computePayloadHash(data);

  // Step 4: Check for duplicate payload (outside transaction — read-only)
  const existing = db
    .select({ receipt_id: ingestReceipt.receipt_id })
    .from(ingestReceipt)
    .where(eq(ingestReceipt.payload_sha256, payloadHash))
    .get();

  if (existing) {
    log.info(
      { fileId: file.file_id, importIds: file.imports.map((i) => i.import_id) },
      'duplicate payload detected, skipping',
    );
    return {
      success: true,
      importIds: file.imports.map((i) => i.import_id),
      duplicate: true,
      durationMs: Math.round(performance.now() - startTime),
    };
  }

  // Step 5: Build sourceSystemByImportId map
  const sourceSystemByImportId = new Map<string, string>();
  for (const imp of file.imports) {
    sourceSystemByImportId.set(imp.import_id, imp.source_system);
  }

  // Step 6: Generate quality warnings (before transaction — pure function)
  const warnings = generateQualityWarnings(file);

  // Step 7: Insert all entities inside a single atomic transaction
  let receiptId: string | undefined;
  let analysisResult: AnalysisEngineResult | undefined;
  const entityCounts: Record<string, number> = {};

  db.transaction((tx) => {
    const ctx: IngestContext = {
      tx,
      file,
      subjectId: file.subject.subject_id,
      sourceSystemByImportId,
      entityCounts,
      logger: log.child({ fileId: file.file_id }),
    };

    // Provenance (root entities)
    insertSubject(ctx);
    insertCreditFile(ctx);
    insertImportBatches(ctx);
    insertRawArtifacts(ctx);

    // Identity
    insertPersonNames(ctx);
    insertSubjectIdentifiers(ctx);
    insertAddresses(ctx);
    insertAddressAssociations(ctx);
    insertAddressLinks(ctx);
    insertFinancialAssociates(ctx);
    insertElectoralRollEntries(ctx);

    // Organisations + Tradelines (with all child entities)
    insertOrganisations(ctx);
    insertTradelines(ctx);

    // Records
    insertSearchRecords(ctx);
    insertCreditScores(ctx);
    insertPublicRecords(ctx);
    insertNoticesOfCorrection(ctx);
    insertPropertyRecords(ctx);
    insertGoneAwayRecords(ctx);
    insertFraudMarkers(ctx);
    insertAttributableItems(ctx);
    insertDisputes(ctx);

    // Quality warnings → generated_insight rows
    insertQualityWarnings(ctx, warnings);

    // Anomaly detection rules → generated_insight rows
    const anomalyConfig = loadAnomalyConfig(tx);
    analysisResult = runAnomalyRules(
      {
        db: tx,
        file,
        subjectId: file.subject.subject_id,
        importIds: file.imports.map((i) => i.import_id),
        sourceSystemByImportId,
        config: anomalyConfig,
        logger: log,
      },
      defaultRules,
    );
    if (analysisResult.insightCount > 0) {
      entityCounts.anomaly_insights = analysisResult.insightCount;
    }

    // Ingest receipt (last — after all entities)
    const durationMs = Math.round(performance.now() - startTime);
    receiptId = insertIngestReceipt(ctx, {
      payloadSha256: payloadHash,
      durationMs,
      status: 'success',
    });

    // Audit log
    insertAuditLogEntry(ctx, 'ingest.completed', {
      file_id: file.file_id,
      entity_counts: entityCounts,
      duration_ms: durationMs,
    });
  });

  const durationMs = Math.round(performance.now() - startTime);
  const importIds = file.imports.map((i) => i.import_id);
  log.info(
    { fileId: file.file_id, importIds, durationMs, entityCounts },
    'ingestion completed',
  );

  return {
    success: true,
    importIds,
    warnings: warnings.length > 0 ? warnings : undefined,
    receiptId,
    durationMs,
    summary: entityCounts,
    analysisResult,
  };
}
