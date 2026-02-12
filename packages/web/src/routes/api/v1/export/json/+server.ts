import { reconstructCreditFile } from '@ctview/core';
import { apiError, ErrorCode } from '$lib/server/api';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url, locals }) => {
  const fileId = url.searchParams.get('fileId');
  if (!fileId) {
    return apiError(ErrorCode.VALIDATION_FAILED, 'fileId query parameter is required');
  }

  const creditFile = reconstructCreditFile(locals.db, fileId);
  if (!creditFile) {
    return apiError(ErrorCode.NOT_FOUND, `No credit file found with id: ${fileId}`);
  }

  const body = JSON.stringify(creditFile, null, 2);
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="credit-file-${fileId}.json"`,
    },
  });
};
