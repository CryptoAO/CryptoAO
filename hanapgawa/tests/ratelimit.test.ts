import { describe, expect, it } from "vitest";
import { LIMITS, rateLimit, rateLimitAsync } from "../src/lib/ratelimit";

// Keys are namespaced per test so the shared module-level map cannot make one
// test's spend leak into another's budget.
let n = 0;
const key = () => `test:${process.pid}:${n++}`;

describe("rateLimit", () => {
  it("allows exactly max calls inside the window, then blocks", () => {
    const k = key();
    for (let i = 0; i < 3; i++) expect(rateLimit(k, 3, 60_000)).toBe(true);
    expect(rateLimit(k, 3, 60_000)).toBe(false);
  });

  it("does not extend the block each time a blocked caller retries", () => {
    // A blocked hit must not be recorded, or a bot hammering the endpoint
    // would keep its own window permanently full and the user could never
    // get back in once the original hits aged out.
    const k = key();
    expect(rateLimit(k, 1, 40)).toBe(true);
    expect(rateLimit(k, 1, 40)).toBe(false);
    expect(rateLimit(k, 1, 40)).toBe(false);
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(rateLimit(k, 1, 40)).toBe(true);
        resolve();
      }, 60);
    });
  });

  it("keeps separate budgets per key", () => {
    const a = key();
    const b = key();
    expect(rateLimit(a, 1, 60_000)).toBe(true);
    expect(rateLimit(a, 1, 60_000)).toBe(false);
    expect(rateLimit(b, 1, 60_000)).toBe(true);
  });
});

describe("rateLimitAsync", () => {
  it("falls back to the in-process limiter when no shared store is configured", async () => {
    expect(process.env.REDIS_URL).toBeUndefined();
    const k = key();
    expect(await rateLimitAsync(k, 2, 60_000)).toBe(true);
    expect(await rateLimitAsync(k, 2, 60_000)).toBe(true);
    expect(await rateLimitAsync(k, 2, 60_000)).toBe(false);
  });
});

describe("LIMITS", () => {
  it("keeps OTP sends tight enough that a stolen number cannot be spammed", () => {
    // Each send costs real money and lands on someone's phone.
    expect(LIMITS.otpSend.max).toBeLessThanOrEqual(5);
    expect(LIMITS.otpSend.windowMs).toBeGreaterThanOrEqual(5 * 60_000);
  });

  it("leaves login attempts low enough to blunt credential stuffing", () => {
    expect(LIMITS.login.max).toBeLessThanOrEqual(10);
  });
});
