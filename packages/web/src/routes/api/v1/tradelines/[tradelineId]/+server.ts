import { getTradelineDetail } from '@ctview/core';
import { apiSuccess, apiError, ErrorCode } from '$lib/server/api';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params, locals }) => {
  const result = getTradelineDetail(locals.db, params.tradelineId);
  if (!result) return apiError(ErrorCode.NOT_FOUND, 'Tradeline not found');
  return apiSuccess(result);
};
