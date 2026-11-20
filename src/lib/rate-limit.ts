// Best-effort fixed-window limiter. State lives in the serverless instance's
// memory, so it slows casual abuse but is not a global guarantee: for that,
// swap the Map for a shared store (Upstash Redis / Vercel KV) behind the same
// interface.

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export interface RateLimiter {
  check: (key: string, now?: number) => RateLimitResult;
  reset: () => void;
}

export function createRateLimiter(limit: number, windowMs: number): RateLimiter {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return {
    check(key, now = Date.now()) {
      if (hits.size > 10_000) {
        for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
      }
      const entry = hits.get(key);
      if (!entry || entry.resetAt <= now) {
        hits.set(key, { count: 1, resetAt: now + windowMs });
        return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
      }
      entry.count += 1;
      const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
      if (entry.count > limit) {
        return { ok: false, remaining: 0, retryAfterSeconds };
      }
      return { ok: true, remaining: limit - entry.count, retryAfterSeconds: 0 };
    },
    reset() {
      hits.clear();
    },
  };
}

export function clientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anon";
  return ip;
}

export function tooManyRequests(retryAfterSeconds: number): Response {
  return Response.json(
    { error: "Too many requests. Please wait a moment and try again." },
    {
      status: 429,
      headers: { "Retry-After": String(Math.max(1, retryAfterSeconds)) },
    },
  );
}

/**
 * Reject cross-site browser calls to our API. Requests without an Origin
 * header (curl, server-to-server) pass; the rate limiter covers those.
 */
export function isAllowedOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// 10 analyses / 20 chat turns per minute per IP: generous for a person,
// expensive to script.
export const summarizeLimiter = createRateLimiter(10, 60_000);
export const chatLimiter = createRateLimiter(20, 60_000);
