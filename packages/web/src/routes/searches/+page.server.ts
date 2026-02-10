import { listSearches, searchListSchema } from '@ctview/core';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const parsed = searchListSchema.safeParse(Object.fromEntries(url.searchParams));
  const params = parsed.success ? parsed.data : { limit: 50, offset: 0 };
  return listSearches(locals.db, params);
};
