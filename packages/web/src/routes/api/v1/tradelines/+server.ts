import { tradelineListSchema, listTradelines } from '@ctview/core';
import { apiSuccess, apiError, ErrorCode } from '$lib/server/api';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url, locals }) => {
  const parsed = tradelineListSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return apiError(ErrorCode.VALIDATION_FAILED, 'Invalid query parameters');
  const result = listTradelines(locals.db, parsed.data);
  return apiSuccess(result);
};
