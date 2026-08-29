import { describe, expect, it } from "vitest";
import { splitCommission, formatPhp, parsePhpToCents, sukiTakeRateBps } from "../src/lib/money";

describe("splitCommission", () => {
  it("splits 12% correctly", () => {
    expect(splitCommission(35000, 1200)).toEqual({ commissionCents: 4200, payoutCents: 30800 });
  });
  it("always sums back to the original amount", () => {
    for (const amount of [1, 99, 5000, 12345, 99999, 123456789]) {
      for (const bps of [0, 500, 1200, 1500, 3000]) {
        const { commissionCents, payoutCents } = splitCommission(amount, bps);
        expect(commissionCents + payoutCents).toBe(amount);
        expect(commissionCents).toBeGreaterThanOrEqual(0);
        expect(payoutCents).toBeGreaterThanOrEqual(0);
      }
    }
  });
  it("rejects non-integer and non-positive amounts", () => {
    expect(() => splitCommission(0, 1200)).toThrow();
    expect(() => splitCommission(-100, 1200)).toThrow();
    expect(() => splitCommission(100.5, 1200)).toThrow();
  });
  it("rejects take rates above the 30% ceiling", () => {
    expect(() => splitCommission(10000, 3001)).toThrow();
    expect(() => splitCommission(10000, -1)).toThrow();
  });
});

describe("formatPhp", () => {
  it("formats whole pesos", () => {
    expect(formatPhp(150000)).toBe("₱1,500");
  });
  it("formats centavos", () => {
    expect(formatPhp(12345)).toBe("₱123.45");
  });
});

describe("parsePhpToCents", () => {
  it("parses plain numbers and formatted strings", () => {
    expect(parsePhpToCents(500)).toBe(50000);
    expect(parsePhpToCents("1,500")).toBe(150000);
    expect(parsePhpToCents("₱250.50")).toBe(25050);
  });
  it("rejects negatives and garbage", () => {
    expect(() => parsePhpToCents(-5)).toThrow();
    expect(() => parsePhpToCents("abc")).toThrow();
  });
});

describe("sukiTakeRateBps — the suki ladder", () => {
  it("charges the base rate to a brand-new pair", () => {
    expect(sukiTakeRateBps(1200, 0)).toBe(1200);
    expect(sukiTakeRateBps(1200, 2)).toBe(1200);
  });

  it("drops two points once a pair has three completed jobs together", () => {
    expect(sukiTakeRateBps(1200, 3)).toBe(1000);
    expect(sukiTakeRateBps(1200, 9)).toBe(1000);
  });

  it("drops four points for an established suki pair", () => {
    expect(sukiTakeRateBps(1200, 10)).toBe(800);
    expect(sukiTakeRateBps(1200, 100)).toBe(800);
  });

  it("never goes below the floor, whatever the category base is", () => {
    expect(sukiTakeRateBps(600, 10)).toBe(500);
    expect(sukiTakeRateBps(500, 3)).toBe(500);
  });

  it("stays inside the range splitCommission accepts", () => {
    // The ladder output is frozen onto the job and later fed to
    // splitCommission — an out-of-range value would break escrow release.
    for (const base of [500, 1200, 3000]) {
      for (const n of [0, 3, 10, 50]) {
        expect(() => splitCommission(10_000, sukiTakeRateBps(base, n))).not.toThrow();
      }
    }
  });
});
