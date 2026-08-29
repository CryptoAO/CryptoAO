import { describe, expect, it } from "vitest";
import { PriceGuidance, assessBudget, percentile, roundPeso } from "../src/lib/pricing";

const guidance = (over: Partial<PriceGuidance> = {}): PriceGuidance => ({
  lowCents: 30_000, // ₱300
  highCents: 60_000, // ₱600
  source: "estimate",
  sampleSize: 0,
  note: null,
  minCents: 10_000, // ₱100
  ...over,
});

describe("percentile", () => {
  const set = [100, 200, 300, 400, 500, 600, 700, 800];

  it("returns a value that someone actually paid, not an interpolation", () => {
    expect(set).toContain(percentile(set, 25));
    expect(set).toContain(percentile(set, 75));
  });

  it("puts p25 below p75", () => {
    expect(percentile(set, 25)).toBeLessThan(percentile(set, 75));
  });

  it("clamps at both ends instead of running off the array", () => {
    expect(percentile(set, 0)).toBe(100);
    expect(percentile(set, 100)).toBe(800);
  });

  it("handles a single data point", () => {
    expect(percentile([250], 25)).toBe(250);
    expect(percentile([250], 75)).toBe(250);
  });

  it("refuses an empty set rather than inventing a price", () => {
    expect(() => percentile([], 50)).toThrow();
  });
});

describe("roundPeso", () => {
  it("rounds to the nearest ₱10 so a range does not read as fake precision", () => {
    expect(roundPeso(28_734)).toBe(29_000);
    expect(roundPeso(28_234)).toBe(28_000);
  });
});

describe("assessBudget", () => {
  it("flags a budget under the category floor", () => {
    expect(assessBudget(5_000, guidance())).toBe("BELOW_MIN");
  });

  it("calls a budget inside the range typical", () => {
    expect(assessBudget(30_000, guidance())).toBe("TYPICAL");
    expect(assessBudget(45_000, guidance())).toBe("TYPICAL");
    expect(assessBudget(60_000, guidance())).toBe("TYPICAL");
  });

  it("leaves haggling room just under the low end", () => {
    // ₱270 against a ₱300–600 range is close enough that a provider will
    // still counter-offer; nagging here would train people to ignore us.
    expect(assessBudget(27_000, guidance())).toBe("TYPICAL");
  });

  it("warns once a budget is meaningfully below the going rate", () => {
    expect(assessBudget(20_000, guidance())).toBe("LOW");
  });

  it("recognises a budget above the range", () => {
    expect(assessBudget(80_000, guidance())).toBe("GENEROUS");
  });

  it("never blocks: every budget gets a verdict, never an exception", () => {
    for (const cents of [1, 9_999, 10_000, 1_000_000]) {
      expect(() => assessBudget(cents, guidance())).not.toThrow();
    }
  });
});
