import { listTradelines, tradelineListSchema } from '@ctview/core';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const parsed = tradelineListSchema.safeParse(Object.fromEntries(url.searchParams));
  const params = parsed.success ? parsed.data : { limit: 50, offset: 0 };
  return listTradelines(locals.db, params);
};
