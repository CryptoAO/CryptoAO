// Sliding-window rate limiter. In-memory per instance — good for a single
// node and for dev. At scale, swap the store for Redis (see docs/SCALING.md);
// the call-site API stays the same.

const windows = new Map<string, number[]>();
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, hits] of windows) {
    if (hits.length === 0 || hits[hits.length - 1] < now - 15 * 60_000) windows.delete(key);
  }
}

/** Returns true if the call is allowed. */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now);
  const hits = (windows.get(key) ?? []).filter((t) => t > now - windowMs);
  if (hits.length >= max) {
    windows.set(key, hits);
    return false;
  }
  hits.push(now);
  windows.set(key, hits);
  return true;
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
