import { subject, creditFile, importBatch, rawArtifact } from '../../schema/sqlite/index.js';
import { toJsonText } from '../transforms.js';
import type { IngestContext } from '../ingest-context.js';

export function insertSubject(ctx: IngestContext): void {
  ctx.tx
    .insert(subject)
    .values({
      subject_id: ctx.file.subject.subject_id,
      created_at: ctx.file.created_at,
      extensions_json: toJsonText(ctx.file.subject.extensions),
    })
    .run();
  ctx.entityCounts.subjects = 1;
}

export function insertCreditFile(ctx: IngestContext): void {
  ctx.tx
    .insert(creditFile)
    .values({
      file_id: ctx.file.file_id,
      schema_version: ctx.file.schema_version,
      currency_code: ctx.file.currency_code ?? 'GBP',
      subject_id: ctx.subjectId,
      created_at: ctx.file.created_at,
      extensions_json: toJsonText(ctx.file.extensions),
    })
    .run();
  ctx.entityCounts.credit_files = 1;
}

export function insertImportBatches(ctx: IngestContext): void {
  const imports = ctx.file.imports;
  if (!imports.length) return;

  for (const imp of imports) {
    ctx.tx
      .insert(importBatch)
      .values({
        import_id: imp.import_id,
        file_id: ctx.file.file_id,
        subject_id: ctx.subjectId,
        imported_at: imp.imported_at,
        currency_code: imp.currency_code ?? ctx.file.currency_code ?? 'GBP',
        source_system: imp.source_system,
        source_wrapper: imp.source_wrapper,
        acquisition_method: imp.acquisition_method,
        mapping_version: imp.mapping_version,
        confidence_notes: imp.confidence_notes,
        extensions_json: toJsonText(imp.extensions),
      })
      .run();
  }
  ctx.entityCounts.import_batches = imports.length;
}

export function insertRawArtifacts(ctx: IngestContext): void {
  let count = 0;
  for (const imp of ctx.file.imports) {
    for (const art of imp.raw_artifacts ?? []) {
      ctx.tx
        .insert(rawArtifact)
        .values({
          artifact_id: art.artifact_id,
          import_id: imp.import_id,
          artifact_type: art.artifact_type,
          sha256: art.sha256,
          uri: art.uri,
          embedded_base64: art.embedded_base64,
          extracted_text_ref: art.extracted_text_ref,
          extensions_json: toJsonText(art.extensions),
        })
        .run();
      count++;
    }
  }
  ctx.entityCounts.raw_artifacts = count;
}
