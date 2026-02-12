import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { getConfig } from '$lib/server/config';
import { getDb } from '$lib/server/db';
import { apiError, ErrorCode } from '$lib/server/api';
import { createRateLimiter } from '$lib/server/rate-limit';
import { getLogger } from '$lib/server/logger';

/**
 * Logging handler — runs first in the sequence.
 * Creates a per-request child logger with request metadata and logs completion.
 */
const handleLogging: Handle = async ({ event, resolve }) => {
  const logger = getLogger();
  const requestId = crypto.randomUUID().slice(0, 8);
  const method = event.request.method;
  const path = event.url.pathname;

  event.locals.logger = logger.child({ requestId, method, path });

  const start = performance.now();
  const response = await resolve(event);
  const durationMs = Math.round(performance.now() - start);

  event.locals.logger.info({ status: response.status, durationMs }, 'request completed');

  return response;
};

/**
 * CORS handler for /api/* routes.
 * Reads CORS_ALLOW_ORIGIN from validated config:
 * - Empty string (default): no CORS headers (same-origin only)
 * - '*': allow all origins
 * - Specific origin: allow only that origin
 */
const handleCors: Handle = async ({ event, resolve }) => {
  const isApiRoute = event.url.pathname.startsWith('/api/');
  if (!isApiRoute) {
    return resolve(event);
  }

  const config = getConfig();
  const allowOrigin = config.CORS_ALLOW_ORIGIN;

  // No CORS configured — same-origin only
  if (!allowOrigin) {
    return resolve(event);
  }

  // Handle OPTIONS preflight
  if (event.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Add CORS headers to actual responses
  const response = await resolve(event);
  response.headers.set('Access-Control-Allow-Origin', allowOrigin);
  return response;
};

/**
 * Rate limiter for ingestion endpoints.
 * Uses a fixed window of 60 seconds keyed by client IP.
 */
const ingestLimiter = createRateLimiter(30, 60_000);

const handleRateLimit: Handle = async ({ event, resolve }) => {
  if (event.request.method !== 'POST' || !event.url.pathname.startsWith('/api/v1/ingest')) {
    return resolve(event);
  }

  const config = getConfig();
  const maxRpm = config.RATE_LIMIT_INGEST_RPM;

  // 0 means rate limiting is disabled
  if (maxRpm === 0) {
    return resolve(event);
  }

  // Recreate limiter if config differs from default
  const limiter = maxRpm === 30 ? ingestLimiter : createRateLimiter(maxRpm, 60_000);
  const ip = event.getClientAddress();
  const result = limiter.check(ip);

  if (!result.allowed) {
    const retryAfterSec = Math.ceil(result.retryAfterMs / 1000);
    event.locals.logger.warn({ ip, retryAfterSec }, 'rate limit exceeded');
    const response = apiError(ErrorCode.RATE_LIMITED, 'Rate limit exceeded');
    response.headers.set('Retry-After', String(retryAfterSec));
    return response;
  }

  return resolve(event);
};

/**
 * Main application handler.
 * Attaches database to locals and checks API key for ingestion endpoints.
 */
const handleApp: Handle = async ({ event, resolve }) => {
  // Attach database singleton to request locals
  event.locals.db = getDb();

  // Optional API key check for ingestion endpoints
  if (event.url.pathname.startsWith('/api/v1/ingest')) {
    const config = getConfig();
    if (config.INGEST_API_KEY) {
      const authHeader = event.request.headers.get('authorization');
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (token !== config.INGEST_API_KEY) {
        return apiError(ErrorCode.UNAUTHORIZED, 'Invalid or missing API key');
      }
    }
  }

  return resolve(event);
};

export const handle = sequence(handleLogging, handleCors, handleRateLimit, handleApp);
