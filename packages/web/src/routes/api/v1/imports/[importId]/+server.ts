import { getImportDetail } from '@ctview/core';
import { apiSuccess, apiError, ErrorCode } from '$lib/server/api';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params, locals }) => {
  const result = getImportDetail(locals.db, params.importId);
  if (!result) return apiError(ErrorCode.NOT_FOUND, 'Import not found');
  return apiSuccess(result);
};
