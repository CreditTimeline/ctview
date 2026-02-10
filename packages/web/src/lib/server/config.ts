import { parseConfig, type AppConfig } from '@ctview/core';
import { env } from '$env/dynamic/private';

let _config: AppConfig | null = null;

/**
 * Lazy singleton for validated application config.
 * Defers parsing until first access so SvelteKit's $env/dynamic/private
 * is guaranteed to be populated. Crashes immediately with clear Zod
 * errors if required env vars are missing or invalid.
 */
export function getConfig(): AppConfig {
  if (!_config) {
    _config = parseConfig(env);
  }
  return _config;
}
