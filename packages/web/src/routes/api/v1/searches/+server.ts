import { searchListSchema, listSearches } from '@ctview/core';
import { apiSuccess, apiError, ErrorCode } from '$lib/server/api';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url, locals }) => {
  const parsed = searchListSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return apiError(ErrorCode.VALIDATION_FAILED, 'Invalid query parameters');
  const result = listSearches(locals.db, parsed.data);
  return apiSuccess(result);
};
