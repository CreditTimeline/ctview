import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type * as schema from '../schema/sqlite/index.js';
import type * as relations from '../schema/relations.js';
import type { CreditFile } from '../types/canonical.js';

/**
 * Shared context passed to all inserter functions during ingestion.
 * Avoids threading 5+ arguments through every function call.
 */
export interface IngestContext {
  /** Drizzle transaction handle (includes table + relation definitions) */
  tx: BetterSQLite3Database<typeof schema & typeof relations>;
  /** The validated, typed credit file payload */
  file: CreditFile;
  /** Top-level subject_id from the credit file */
  subjectId: string;
  /** Maps import_id → source_system for deriving source_system on child entities */
  sourceSystemByImportId: Map<string, string>;
  /** Counts of inserted entities, accumulated during ingestion */
  entityCounts: Record<string, number>;
}
