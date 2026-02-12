import { runCompaction } from '@ctview/core';
import { apiSuccess, apiError, ErrorCode } from '$lib/server/api';
import { getConfig } from '$lib/server/config';
import type { RequestHandler } from './$types';

/** POST /api/v1/maintenance/compact — run data compaction */
export const POST: RequestHandler = ({ request, locals }) => {
  const config = getConfig();
  if (config.INGEST_API_KEY) {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token !== config.INGEST_API_KEY) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Invalid or missing API key');
    }
  }

  try {
    const result = runCompaction(locals.db);
    return apiSuccess(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Compaction failed';
    return apiError(ErrorCode.INTERNAL_ERROR, message);
  }
};
