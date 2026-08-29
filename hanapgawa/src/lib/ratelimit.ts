// Sliding-window rate limiter.
//
// Two stores behind one interface. In-memory is correct for a single node
// and for dev. Once the app runs on more than one instance, an in-process
// counter silently multiplies every limit by the instance count — eight
// login attempts becomes eight per server — so production sets REDIS_URL
// and the same limits apply fleet-wide.
//
// Call sites use `rateLimit()` (sync, memory) or `rateLimitAsync()` (shared
// store when configured). Auth and money paths should prefer the async one.

interface Window {
  hits: number[];
}

const windows = new Map<string, Window>();
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, w] of windows) {
    if (w.hits.length === 0 || w.hits[w.hits.length - 1] < now - 15 * 60_000) windows.delete(key);
  }
}

/** Synchronous, per-instance. Returns true if the call is allowed. */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now);
  const hits = (windows.get(key)?.hits ?? []).filter((t) => t > now - windowMs);
  if (hits.length >= max) {
    windows.set(key, { hits });
    return false;
  }
  hits.push(now);
  windows.set(key, { hits });
  return true;
}

/* ----------------------------- shared store ----------------------------- */

type Incr = (key: string, windowMs: number) => Promise<number>;

let sharedIncr: Incr | null = null;
let sharedInit = false;

/**
 * Lazily wire up Redis if REDIS_URL is set AND the client library is
 * installed. Missing either one is not an error — the app falls back to
 * the in-process limiter, which is the correct behaviour for one node.
 */
async function getSharedIncr(): Promise<Incr | null> {
  if (sharedInit) return sharedIncr;
  sharedInit = true;

  const url = process.env.REDIS_URL;
  if (!url) return null;

  try {
    // ioredis is a genuinely optional dependency: single-node deployments
    // never install it. The specifier is built at runtime so TypeScript does
    // not try to resolve a package that may not be there, and webpackIgnore
    // keeps the bundler from following it either — without the comment the
    // build emits a "critical dependency" warning for the expression.
    const specifier = ["io", "redis"].join("");
    const mod = (await import(/* webpackIgnore: true */ specifier).catch(() => null)) as
      | { default: new (url: string) => RedisLike }
      | null;
    if (!mod?.default) {
      console.warn("REDIS_URL is set but ioredis is not installed — using in-memory rate limits");
      return null;
    }
    const client = new mod.default(url);

    sharedIncr = async (key, windowMs) => {
      // INCR + EXPIRE is a fixed window, not a sliding one: cheaper, and the
      // difference only matters at a window boundary, which is acceptable
      // for abuse control.
      const bucket = Math.floor(Date.now() / windowMs);
      const k = `rl:${key}:${bucket}`;
      const count = await client.incr(k);
      if (count === 1) await client.pexpire(k, windowMs * 2);
      return count;
    };
    return sharedIncr;
  } catch (e) {
    console.error("Redis rate limiter unavailable — using in-memory", e);
    return null;
  }
}

interface RedisLike {
  incr(key: string): Promise<number>;
  pexpire(key: string, ms: number): Promise<number>;
}

/**
 * Fleet-wide when REDIS_URL is configured, per-instance otherwise.
 * Fails OPEN on a store error: a Redis outage must not lock every user
 * out of logging in.
 */
export async function rateLimitAsync(key: string, max: number, windowMs: number): Promise<boolean> {
  const incr = await getSharedIncr();
  if (!incr) return rateLimit(key, max, windowMs);
  try {
    const count = await incr(key, windowMs);
    return count <= max;
  } catch (e) {
    console.error("rate limit store failed, allowing request", e);
    return true;
  }
}

export const LIMITS = {
  // key prefix: [max, windowMs]
  otpSend: { max: 3, windowMs: 10 * 60_000 }, // per phone
  otpVerify: { max: 6, windowMs: 10 * 60_000 },
  login: { max: 8, windowMs: 15 * 60_000 }, // per IP
  register: { max: 5, windowMs: 60 * 60_000 },
  message: { max: 30, windowMs: 60_000 },
  jobPost: { max: 10, windowMs: 60 * 60_000 },
  generic: { max: 120, windowMs: 60_000 },
} as const;
