import { sql } from '@ctview/core';
import { apiSuccess, apiError, ErrorCode } from '$lib/server/api';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  try {
    locals.db.all(sql`SELECT 1`);
    return apiSuccess({ status: 'ready' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database unreachable';
    return apiError(ErrorCode.NOT_READY, `Database health check failed: ${message}`);
  }
};
