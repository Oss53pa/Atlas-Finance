/**
 * Simple in-memory rate limiter for Supabase Edge Functions.
 * Tracks requests per user per time window.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60 * 60 * 1000, // 1 hour
};

/**
 * Check if a request should be rate limited.
 * Returns null if allowed, or a Response if rate limited.
 */
export function checkRateLimit(
  userId: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): Response | null {
  const now = Date.now();
  const key = userId;

  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return null;
  }

  entry.count++;

  if (entry.count > config.maxRequests) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)),
        },
      }
    );
  }

  return null;
}

/**
 * Extract user ID from Supabase auth header for rate limiting.
 */
export function getUserIdFromRequest(req: Request): string {
  const authHeader = req.headers.get('authorization') || '';
  // Use a hash of the auth token as user identifier
  return authHeader.slice(-16) || 'anonymous';
}
