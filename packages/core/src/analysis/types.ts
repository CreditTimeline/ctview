import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type * as schema from '../schema/sqlite/index.js';
import type * as relations from '../schema/relations.js';
import type { CreditFile } from '../types/canonical.js';
import type { InsightSeverity } from '../types/enums.js';
import type { AnomalyConfig } from './config.js';
import type { Logger } from '../logger.js';

export interface AnalysisContext {
  db: BetterSQLite3Database<typeof schema & typeof relations>;
  file: CreditFile;
  subjectId: string;
  importIds: string[];
  sourceSystemByImportId: Map<string, string>;
  config: AnomalyConfig;
  logger?: Logger;
}

export interface InsightResult {
  kind: string;
  severity: InsightSeverity;
  summary: string;
  entityIds?: string[];
  extensions?: Record<string, unknown>;
}

export interface AnomalyRule {
  id: string;
  name: string;
  evaluate: (ctx: AnalysisContext) => InsightResult[];
}

export interface AnalysisEngineResult {
  insightCount: number;
  ruleErrors: { ruleId: string; error: string }[];
}
