import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type Database from 'better-sqlite3';

export function migrateDatabase(db: Database.Database) {
  // Find the SQL DDL relative to this package
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const ddlPath = resolve(__dirname, '../../../../spec/sql/credittimeline-v1.sql');
  const ddl = readFileSync(ddlPath, 'utf-8');
  db.exec(ddl);
}
