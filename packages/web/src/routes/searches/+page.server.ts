import {
  listSearches,
  searchListSchema,
  getSearchTimeline,
  getSearchFrequency,
  listSubjects,
  type SearchTimelineData,
  type SearchFrequencyData,
} from '@ctview/core';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const raw = Object.fromEntries(url.searchParams);
  const cleaned = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== ''));
  const parsed = searchListSchema.safeParse(cleaned);
  const params = parsed.success ? parsed.data : { limit: 50, offset: 0 };
  const listResult = listSearches(locals.db, params);

  const subjects = listSubjects(locals.db, { limit: 1, offset: 0 });
  const subjectId = params.subjectId ?? subjects.items[0]?.subjectId ?? null;

  let timeline: SearchTimelineData = { hardSearches: [], softSearches: [] };
  let frequency: SearchFrequencyData = { items: [] };

  if (subjectId) {
    timeline = getSearchTimeline(locals.db, subjectId);
    frequency = getSearchFrequency(locals.db, subjectId);
  }

  return {
    ...listResult,
    limit: params.limit ?? 50,
    offset: params.offset ?? 0,
    timeline,
    frequency,
    filters: {
      visibility: params.visibility ?? '',
      searchType: params.searchType ?? '',
    },
  };
};
