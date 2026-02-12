import { error } from '@sveltejs/kit';
import { getImportDetail } from '@ctview/core';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
  const detail = getImportDetail(locals.db, params.importId);
  if (!detail) {
    throw error(404, 'Import not found');
  }
  return { detail };
};
