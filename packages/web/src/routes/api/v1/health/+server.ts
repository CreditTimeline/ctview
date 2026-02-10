import { apiSuccess } from '$lib/server/api';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  return apiSuccess({ status: 'ok', version: '0.1.0' });
};
