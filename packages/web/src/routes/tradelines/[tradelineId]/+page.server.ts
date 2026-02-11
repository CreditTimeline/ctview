import { error } from '@sveltejs/kit';
import { getTradelineDetail, getTradelineMetrics } from '@ctview/core';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
  const detail = getTradelineDetail(locals.db, params.tradelineId);
  if (!detail) {
    throw error(404, 'Tradeline not found');
  }
  const metrics = getTradelineMetrics(locals.db, params.tradelineId);
  return { detail, metrics };
};
