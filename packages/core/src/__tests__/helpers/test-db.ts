import { createDatabase, type AppDatabase } from '../../db/client.js';

/**
 * Creates an isolated in-memory database for testing.
 * Each call returns a fresh DB with the full DDL applied,
 * so tests never interfere with each other.
 */
export function createTestDb(): AppDatabase {
  return createDatabase(':memory:');
}
