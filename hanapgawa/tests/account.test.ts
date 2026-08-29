import { describe, expect, it } from "vitest";
import { OPEN_COMMITMENT_STATES, closureBlockers } from "../src/lib/account";
import { JOB_STATUSES } from "../src/lib/jobs";

const clear = { activeJobs: 0, balanceCents: 0, pendingPayouts: 0 };

describe("closureBlockers", () => {
  it("lets a settled account close", () => {
    const r = closureBlockers(clear);
    expect(r.canClose).toBe(true);
    expect(r.blockers).toHaveLength(0);
  });

  it("blocks while somebody is still owed work", () => {
    const r = closureBlockers({ ...clear, activeJobs: 2 });
    expect(r.canClose).toBe(false);
    expect(r.blockers[0].code).toBe("ACTIVE_JOBS");
    expect(r.blockers[0].message).toContain("2");
  });

  it("uses singular copy for one job — a plural count reads as a bug", () => {
    expect(closureBlockers({ ...clear, activeJobs: 1 }).blockers[0].message).toContain("1 trabaho");
  });

  it("blocks on a positive wallet balance and says the amount", () => {
    const r = closureBlockers({ ...clear, balanceCents: 44_000 });
    expect(r.canClose).toBe(false);
    expect(r.blockers[0].code).toBe("WALLET_BALANCE");
    expect(r.blockers[0].message).toContain("440");
  });

  it("does not block on a zero or negative balance", () => {
    // Negative should never happen, but if it does, trapping someone in an
    // account they want to leave is the wrong response to our own bug.
    expect(closureBlockers({ ...clear, balanceCents: 0 }).canClose).toBe(true);
    expect(closureBlockers({ ...clear, balanceCents: -100 }).canClose).toBe(true);
  });

  it("blocks while a cash-out is still in flight", () => {
    expect(closureBlockers({ ...clear, pendingPayouts: 1 }).blockers[0].code).toBe("PENDING_PAYOUT");
  });

  it("reports every blocker at once, not one at a time", () => {
    // Being told to fix one thing, then another, then a third is how people
    // give up and email support instead.
    const r = closureBlockers({ activeJobs: 1, balanceCents: 5_000, pendingPayouts: 1 });
    expect(r.blockers.map((b) => b.code)).toEqual(["ACTIVE_JOBS", "WALLET_BALANCE", "PENDING_PAYOUT"]);
  });

  it("gives every blocker something the person can act on", () => {
    const r = closureBlockers({ activeJobs: 1, balanceCents: 5_000, pendingPayouts: 1 });
    for (const b of r.blockers) expect(b.message.length).toBeGreaterThan(20);
  });
});

describe("OPEN_COMMITMENT_STATES", () => {
  it("covers every job state that is not finished", () => {
    const finished = ["COMPLETED", "CANCELLED"];
    const unfinished = JOB_STATUSES.filter((s) => !finished.includes(s));
    expect([...OPEN_COMMITMENT_STATES].sort()).toEqual([...unfinished].sort());
  });

  it("does not hold an account open over finished jobs", () => {
    expect(OPEN_COMMITMENT_STATES).not.toContain("COMPLETED");
    expect(OPEN_COMMITMENT_STATES).not.toContain("CANCELLED");
  });
});
