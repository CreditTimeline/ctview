import { importListSchema, listImports } from '@ctview/core';
import { apiSuccess, apiError, ErrorCode } from '$lib/server/api';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url, locals }) => {
  const parsed = importListSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return apiError(ErrorCode.VALIDATION_FAILED, 'Invalid query parameters');
  const result = listImports(locals.db, parsed.data);
  return apiSuccess(result);
};
