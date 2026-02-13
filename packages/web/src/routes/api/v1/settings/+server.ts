import { getAppSettings, updateAppSetting } from '@ctview/core';
import { apiSuccess, apiError, ErrorCode } from '$lib/server/api';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => {
  const settings = getAppSettings(locals.db);
  return apiSuccess(settings);
};

export const PUT: RequestHandler = async ({ request, locals }) => {
  const body = await request.json();
  if (!body.key || typeof body.key !== 'string' || typeof body.value !== 'string') {
    return apiError(
      ErrorCode.VALIDATION_FAILED,
      'Request body must include "key" and "value" strings',
    );
  }

  // Protect read-only keys
  const readOnlyKeys = ['ddl_hash'];
  if (readOnlyKeys.includes(body.key)) {
    return apiError(ErrorCode.VALIDATION_FAILED, `Key "${body.key}" is read-only`);
  }

  const result = updateAppSetting(locals.db, body.key, body.value);
  return apiSuccess(result);
};
