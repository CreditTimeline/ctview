import { getSystemHealth, getAppSettings, getRetentionConfig } from '@ctview/core';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const health = getSystemHealth(locals.db);
  const settings = getAppSettings(locals.db);
  const retention = getRetentionConfig(locals.db);

  // Check if INGEST_API_KEY is configured (don't expose the value)
  const hasApiKey = !!process.env.INGEST_API_KEY;

  // Get last compaction time from settings if available
  const lastCompactionSetting = settings.find((s) => s.key === 'last_compaction_at');
  const lastCompactionAt = lastCompactionSetting?.value ?? null;

  return { health, settings, hasApiKey, retention, lastCompactionAt };
};
