import { listImports, importListSchema } from '@ctview/core';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const parsed = importListSchema.safeParse(Object.fromEntries(url.searchParams));
  const params = parsed.success ? parsed.data : { limit: 50, offset: 0 };
  return {
    ...listImports(locals.db, params),
    limit: params.limit ?? 50,
    offset: params.offset ?? 0,
  };
};
