import {
  listScores,
  scoreListSchema,
  getScoreTrend,
  listSubjects,
  type ScoreTrendData,
} from '@ctview/core';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const raw = Object.fromEntries(url.searchParams);
  const cleaned = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== ''));
  const parsed = scoreListSchema.safeParse(cleaned);
  const params = parsed.success ? parsed.data : { limit: 50, offset: 0 };
  const listResult = listScores(locals.db, params);

  const subjects = listSubjects(locals.db, { limit: 1, offset: 0 });
  const subjectId = params.subjectId ?? subjects.items[0]?.subjectId ?? null;

  let scoreTrend: ScoreTrendData = { series: {} };
  if (subjectId) {
    scoreTrend = getScoreTrend(locals.db, subjectId);
  }

  // Derive latest scores per agency from list items
  const latestByAgency = new Map<string, (typeof listResult.items)[0]>();
  for (const item of listResult.items) {
    if (!latestByAgency.has(item.sourceSystem)) {
      latestByAgency.set(item.sourceSystem, item);
    }
  }

  return {
    ...listResult,
    scoreTrend,
    latestScores: Array.from(latestByAgency.values()).map((s) => ({
      scoreId: s.scoreId,
      sourceSystem: s.sourceSystem,
      scoreValue: s.scoreValue,
      scoreMin: s.scoreMin,
      scoreMax: s.scoreMax,
      scoreBand: s.scoreBand,
      calculatedAt: s.calculatedAt,
    })),
    filters: {
      sourceSystem: params.sourceSystem ?? '',
    },
  };
};
