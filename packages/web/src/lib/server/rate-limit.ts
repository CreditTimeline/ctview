interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Fixed-window rate limiter using an in-memory Map.
 * Window resets after windowMs milliseconds.
 */
export function createRateLimiter(maxRequests: number, windowMs: number) {
  const windows = new Map<string, { count: number; windowStart: number }>();

  return {
    check(key: string): RateLimitResult {
      const now = Date.now();
      const entry = windows.get(key);

      if (!entry || now - entry.windowStart >= windowMs) {
        windows.set(key, { count: 1, windowStart: now });
        return { allowed: true, remaining: maxRequests - 1, retryAfterMs: 0 };
      }

      entry.count++;
      if (entry.count > maxRequests) {
        const retryAfterMs = windowMs - (now - entry.windowStart);
        return { allowed: false, remaining: 0, retryAfterMs };
      }

      return { allowed: true, remaining: maxRequests - entry.count, retryAfterMs: 0 };
    },
  };
}
