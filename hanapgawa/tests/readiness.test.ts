import { describe, expect, it } from "vitest";
import { MIN_BIO, ReadinessInput, providerReadiness } from "../src/lib/readiness";

const fresh: ReadinessInput = {
  kycLevel: 0,
  categoryCount: 0,
  categoriesWithRate: 0,
  bioLength: 0,
  trustedContactCount: 0,
};

const complete: ReadinessInput = {
  kycLevel: 2,
  categoryCount: 2,
  categoriesWithRate: 2,
  bioLength: 120,
  trustedContactCount: 1,
};

describe("providerReadiness", () => {
  it("treats a brand-new provider as unreachable, not merely incomplete", () => {
    const r = providerReadiness(fresh);
    expect(r.ready).toBe(false);
    expect(r.percent).toBe(0);
  });

  it("names exactly the two things that stop jobs reaching someone", () => {
    // These mirror the filter in src/lib/matching.ts. If that filter ever
    // gains a condition, this test should fail until the checklist tells
    // providers about it.
    expect(providerReadiness(fresh).blockedFrom).toEqual(["verify", "categories"]);
  });

  it("clears the block as soon as the phone is verified and a category is picked", () => {
    const r = providerReadiness({ ...fresh, kycLevel: 1, categoryCount: 1 });
    expect(r.ready).toBe(true);
    expect(r.blockedFrom).toEqual([]);
  });

  it("still lists the optional steps once someone is reachable", () => {
    const r = providerReadiness({ ...fresh, kycLevel: 1, categoryCount: 1 });
    expect(r.percent).toBeLessThan(100);
    expect(r.steps.filter((s) => !s.done).every((s) => !s.blocking)).toBe(true);
  });

  it("reaches 100% only when everything is done, so the card can disappear", () => {
    const r = providerReadiness(complete);
    expect(r.percent).toBe(100);
    expect(r.ready).toBe(true);
  });

  it("does not count a one-word bio as an intro", () => {
    expect(providerReadiness({ ...complete, bioLength: MIN_BIO - 1 }).percent).toBeLessThan(100);
    expect(providerReadiness({ ...complete, bioLength: MIN_BIO }).percent).toBe(100);
  });

  it("keeps ID verification optional — it gates big jobs, not all jobs", () => {
    const r = providerReadiness({ ...complete, kycLevel: 1 });
    expect(r.ready).toBe(true);
    expect(r.steps.find((s) => s.id === "kyc2")!.done).toBe(false);
  });

  it("gives every step a reason a person can act on", () => {
    for (const s of providerReadiness(fresh).steps) {
      expect(s.title.length).toBeGreaterThan(5);
      expect(s.why.length).toBeGreaterThan(20);
    }
  });
});
