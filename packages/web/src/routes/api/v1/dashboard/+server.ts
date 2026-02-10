import { getDashboard } from '@ctview/core';
import { apiSuccess } from '$lib/server/api';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => {
  const result = getDashboard(locals.db);
  return apiSuccess(result);
};
