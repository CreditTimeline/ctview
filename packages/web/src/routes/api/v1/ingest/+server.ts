import { ingestCreditFile } from '@ctview/core';
import { apiSuccess, apiError, ErrorCode, type ApiErrorDetail } from '$lib/server/api';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const data = await request.json();
    const result = await ingestCreditFile(locals.db, data);

    if (!result.success) {
      const details: ApiErrorDetail[] = (result.errors ?? []).map((e) => ({ message: e }));
      return apiError(ErrorCode.VALIDATION_FAILED, 'Credit file validation failed', { details });
    }

    return apiSuccess(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return apiError(ErrorCode.INTERNAL_ERROR, message);
  }
};
