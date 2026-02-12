import { exportTradelinesCsv, exportSearchesCsv, exportScoresCsv } from '@ctview/core';
import { apiError, ErrorCode } from '$lib/server/api';
import type { RequestHandler } from './$types';

const exporters: Record<string, (db: Parameters<typeof exportTradelinesCsv>[0], subjectId: string) => string> = {
  tradelines: exportTradelinesCsv,
  searches: exportSearchesCsv,
  scores: exportScoresCsv,
};

export const GET: RequestHandler = ({ url, params, locals }) => {
  const entity = params.entity;
  const exporter = exporters[entity];

  if (!exporter) {
    return apiError(
      ErrorCode.VALIDATION_FAILED,
      `Invalid entity: ${entity}. Must be one of: tradelines, searches, scores`,
    );
  }

  const subjectId = url.searchParams.get('subjectId');
  if (!subjectId) {
    return apiError(ErrorCode.VALIDATION_FAILED, 'subjectId query parameter is required');
  }

  const csv = exporter(locals.db, subjectId);
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${entity}-${subjectId}.csv"`,
    },
  });
};
