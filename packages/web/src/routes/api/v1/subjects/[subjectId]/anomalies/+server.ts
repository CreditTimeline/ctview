import { getSubjectAnomalies } from '@ctview/core';
import { apiSuccess } from '$lib/server/api';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params, locals }) => {
  const result = getSubjectAnomalies(locals.db, params.subjectId);
  return apiSuccess(result);
};
