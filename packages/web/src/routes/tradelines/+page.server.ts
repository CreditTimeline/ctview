import { listTradelines, tradelineListSchema } from '@ctview/core';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const raw = Object.fromEntries(url.searchParams);
  const cleaned = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== ''));
  const parsed = tradelineListSchema.safeParse(cleaned);
  const params = parsed.success ? parsed.data : { limit: 50, offset: 0 };
  return {
    ...listTradelines(locals.db, params),
    filters: {
      accountType: params.accountType ?? '',
      status: params.status ?? '',
      sourceSystem: params.sourceSystem ?? '',
    },
  };
};
