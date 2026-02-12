import { listPublicRecords, publicRecordListSchema } from '@ctview/core';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const parsed = publicRecordListSchema.safeParse(Object.fromEntries(url.searchParams));
  const params = parsed.success ? parsed.data : { limit: 50, offset: 0 };
  return {
    ...listPublicRecords(locals.db, params),
    limit: params.limit ?? 50,
    offset: params.offset ?? 0,
  };
};
