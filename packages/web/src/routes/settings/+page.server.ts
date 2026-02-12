import { getSystemHealth, getAppSettings } from '@ctview/core';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const health = getSystemHealth(locals.db);
  const settings = getAppSettings(locals.db);

  // Check if INGEST_API_KEY is configured (don't expose the value)
  const hasApiKey = !!process.env.INGEST_API_KEY;

  return { health, settings, hasApiKey };
};
