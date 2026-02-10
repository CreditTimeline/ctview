// Config
export { parseConfig, configSchema, type AppConfig } from './config.js';

// Database
export { createDatabase, type AppDatabase, type CreateDatabaseOptions } from './db/client.js';
export { sql } from 'drizzle-orm';
export { migrateDatabase } from './db/migrate.js';

// Schema
export * from './schema/sqlite/index.js';
export * from './schema/types.js';

// Validation
export { validateCreditFile, type ValidationResult } from './validation/validator.js';
export {
  checkReferentialIntegrity,
  type ReferentialCheckResult,
} from './validation/referential-checks.js';

// Ingestion
export { ingestCreditFile, type IngestResult } from './ingestion/ingest-file.js';
export { deriveMetricValueKey } from './ingestion/derive-metric-key.js';
export type { IngestContext } from './ingestion/ingest-context.js';
export type { QualityWarning } from './ingestion/quality-warnings.js';

// Queries
export * from './queries/index.js';

// Types
export * from './types/enums.js';
export type * from './types/canonical.js';
