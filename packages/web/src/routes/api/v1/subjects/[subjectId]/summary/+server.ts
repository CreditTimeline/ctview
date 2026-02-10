import { getSubjectSummary } from '@ctview/core';
import { apiSuccess, apiError, ErrorCode } from '$lib/server/api';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params, locals }) => {
  const result = getSubjectSummary(locals.db, params.subjectId);
  if (!result) return apiError(ErrorCode.NOT_FOUND, 'Subject not found');
  return apiSuccess(result);
};
