import { tradelineMetricsSchema, getTradelineMetrics } from '@ctview/core';
import { apiSuccess, apiError, ErrorCode } from '$lib/server/api';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url, params, locals }) => {
  const parsed = tradelineMetricsSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return apiError(ErrorCode.VALIDATION_FAILED, 'Invalid query parameters');
  const result = getTradelineMetrics(locals.db, params.tradelineId, parsed.data);
  return apiSuccess(result);
};
