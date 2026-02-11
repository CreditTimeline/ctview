import {
  getDashboard,
  getScoreTrend,
  listInsights,
  listSubjects,
  type ScoreTrendData,
  type InsightSummary,
} from '@ctview/core';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const dashboard = getDashboard(locals.db);

  // Get the first subject for score trends and insights
  const subjects = listSubjects(locals.db, { limit: 1, offset: 0 });
  const subjectId = subjects.items[0]?.subjectId ?? null;

  let scoreTrend: ScoreTrendData = { series: {} };
  let recentInsights: InsightSummary[] = [];

  if (subjectId) {
    scoreTrend = getScoreTrend(locals.db, subjectId);
    const insightResult = listInsights(locals.db, {
      subjectId,
      limit: 10,
      offset: 0,
    });
    recentInsights = insightResult.items;
  }

  return {
    ...dashboard,
    scoreTrend,
    recentInsights,
  };
};
