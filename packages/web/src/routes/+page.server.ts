import { getDashboard } from '@ctview/core';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  return getDashboard(locals.db);
};
