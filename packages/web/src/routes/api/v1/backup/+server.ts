import { createBackup, listBackups } from '@ctview/core';
import { apiSuccess, apiError, ErrorCode } from '$lib/server/api';
import { getConfig } from '$lib/server/config';
import type { RequestHandler } from './$types';

function checkAuth(event: Parameters<RequestHandler>[0]): Response | null {
  const config = getConfig();
  if (config.INGEST_API_KEY) {
    const authHeader = event.request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token !== config.INGEST_API_KEY) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Invalid or missing API key') as Response;
    }
  }
  return null;
}

/** GET /api/v1/backup — list all backups */
export const GET: RequestHandler = (event) => {
  const authErr = checkAuth(event);
  if (authErr) return authErr;

  const config = getConfig();
  const backupDir = config.BACKUP_DIR;
  if (!backupDir) {
    return apiError(ErrorCode.VALIDATION_FAILED, 'BACKUP_DIR is not configured');
  }

  const backups = listBackups(backupDir);
  return apiSuccess(backups);
};

/** POST /api/v1/backup — create a new backup */
export const POST: RequestHandler = async (event) => {
  const authErr = checkAuth(event);
  if (authErr) return authErr;

  const config = getConfig();
  const backupDir = config.BACKUP_DIR;
  if (!backupDir) {
    return apiError(ErrorCode.VALIDATION_FAILED, 'BACKUP_DIR is not configured');
  }

  try {
    const result = await createBackup(config.DATABASE_URL, backupDir, event.locals.logger);
    return apiSuccess(result);
  } catch (err) {
    event.locals.logger.error({ err }, 'backup failed');
    const message = err instanceof Error ? err.message : 'Backup failed';
    return apiError(ErrorCode.INTERNAL_ERROR, message);
  }
};
