import { resolve } from 'path';
import { validateBackup, restoreBackup, getSystemHealth } from '@ctview/core';
import { apiSuccess, apiError, ErrorCode } from '$lib/server/api';
import { getConfig } from '$lib/server/config';
import { getDb, resetDb } from '$lib/server/db';
import type { RequestHandler } from './$types';

/** POST /api/v1/restore — restore from a backup */
export const POST: RequestHandler = async ({ request, locals }) => {
  const config = getConfig();
  if (config.INGEST_API_KEY) {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token !== config.INGEST_API_KEY) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Invalid or missing API key');
    }
  }

  const backupDir = config.BACKUP_DIR;
  if (!backupDir) {
    return apiError(ErrorCode.VALIDATION_FAILED, 'BACKUP_DIR is not configured');
  }

  let body: { backupFile?: string };
  try {
    body = await request.json();
  } catch {
    return apiError(ErrorCode.VALIDATION_FAILED, 'Invalid JSON body');
  }

  if (!body.backupFile || typeof body.backupFile !== 'string') {
    return apiError(
      ErrorCode.VALIDATION_FAILED,
      'Request body must include "backupFile" string',
    );
  }

  const backupPath = resolve(backupDir, body.backupFile);

  // Get current DDL hash for validation
  const db = getDb();
  const health = getSystemHealth(db);
  const currentDdlHash = health.schemaVersion;

  // Validate the backup
  const validation = validateBackup(backupPath, currentDdlHash);
  if (!validation.valid) {
    return apiError(ErrorCode.VALIDATION_FAILED, validation.errors.join('; '));
  }

  try {
    // Close the current DB connection
    resetDb();

    // Copy backup over the current database
    restoreBackup(backupPath, config.DATABASE_URL, locals.logger);

    return apiSuccess({
      message: 'Database restored successfully',
      backupFile: body.backupFile,
      ddlHash: validation.backupDdlHash,
    });
  } catch (err) {
    locals.logger.error({ err }, 'restore failed');
    const message = err instanceof Error ? err.message : 'Restore failed';
    return apiError(ErrorCode.INTERNAL_ERROR, message);
  }
};
