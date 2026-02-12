import { createDatabase, type AppDatabase } from '@ctview/core';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { getConfig } from './config.js';

let _db: AppDatabase | null = null;

/**
 * Lazy singleton for the database connection.
 * Uses validated config for DATABASE_URL and AUTO_MIGRATE.
 * Ensures the data directory exists before connecting.
 */
export function getDb(): AppDatabase {
  if (!_db) {
    const config = getConfig();
    const dbUrl = config.DATABASE_URL;

    // Ensure the data directory exists for SQLite
    const dir = dirname(dbUrl);
    if (dir !== '.') {
      mkdirSync(dir, { recursive: true });
    }

    _db = createDatabase(dbUrl, { skipMigration: !config.AUTO_MIGRATE });
  }
  return _db;
}
