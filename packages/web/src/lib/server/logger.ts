import pino from 'pino';
import { getConfig } from './config.js';
import type { Logger } from '@ctview/core';

let _logger: pino.Logger | null = null;

/**
 * Lazy singleton pino logger, configured from LOG_LEVEL.
 * In development, uses pino-pretty for human-readable output.
 */
export function getLogger(): Logger {
  if (!_logger) {
    const config = getConfig();
    const isDev = process.env.NODE_ENV !== 'production';

    _logger = pino({
      level: config.LOG_LEVEL,
      ...(isDev
        ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
        : {}),
    });
  }
  return _logger as unknown as Logger;
}
