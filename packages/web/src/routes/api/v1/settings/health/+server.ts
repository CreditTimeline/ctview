import { getSystemHealth } from '@ctview/core';
import { apiSuccess } from '$lib/server/api';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => {
  const health = getSystemHealth(locals.db);
  return apiSuccess(health);
};
