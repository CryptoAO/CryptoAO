import { describe, expect, it } from "vitest";
import { splitCommission, formatPhp, parsePhpToCents } from "../src/lib/money";

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
