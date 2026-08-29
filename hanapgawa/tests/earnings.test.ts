import { describe, expect, it } from "vitest";
import { newStatementCode, phMonth, summarizePayouts } from "../src/lib/earnings";

const row = (amountCents: number, jobId: string | null, iso: string) => ({
  amountCents,
  jobId,
  createdAt: new Date(iso),
});

describe("phMonth", () => {
  it("buckets by the Philippine wall clock, not UTC", () => {
    // 31 May 17:00 UTC is already 1 June 01:00 in Manila — a payout that
    // lands then belongs to June on the statement the bank reads.
    expect(phMonth(new Date("2026-05-31T17:00:00Z"))).toBe("2026-06");
    expect(phMonth(new Date("2026-05-31T15:59:00Z"))).toBe("2026-05");
  });
});

describe("summarizePayouts — the arithmetic the statement certifies", () => {
  it("totals real payouts and counts distinct jobs", () => {
    const s = summarizePayouts([
      row(44_000, "job-a", "2026-06-05T04:00:00Z"),
      row(35_200, "job-b", "2026-06-20T04:00:00Z"),
      row(88_000, "job-c", "2026-07-02T04:00:00Z"),
    ]);
    expect(s.totalPayoutCents).toBe(167_200);
    expect(s.jobsCount).toBe(3);
  });

  it("breaks the total down by month, in order, and the parts sum to the whole", () => {
    const s = summarizePayouts([
      row(10_000, "a", "2026-07-01T04:00:00Z"),
      row(20_000, "b", "2026-05-10T04:00:00Z"),
      row(30_000, "c", "2026-05-20T04:00:00Z"),
    ]);
    expect(s.monthly.map((m) => m.month)).toEqual(["2026-05", "2026-07"]);
    expect(s.monthly.reduce((n, m) => n + m.payoutCents, 0)).toBe(s.totalPayoutCents);
    expect(s.monthly[0]).toEqual({ month: "2026-05", payoutCents: 50_000, jobs: 2 });
  });

  it("ignores non-positive rows — a statement must never certify a debit as income", () => {
    const s = summarizePayouts([row(44_000, "a", "2026-06-05T04:00:00Z"), row(-44_000, "a", "2026-06-06T04:00:00Z")]);
    expect(s.totalPayoutCents).toBe(44_000);
  });

  it("handles an empty period as zero, not an error", () => {
    const s = summarizePayouts([]);
    expect(s.totalPayoutCents).toBe(0);
    expect(s.jobsCount).toBe(0);
    expect(s.monthly).toEqual([]);
  });

  it("does not double-count a job paid in two ledger rows", () => {
    const s = summarizePayouts([
      row(20_000, "same-job", "2026-06-05T04:00:00Z"),
      row(10_000, "same-job", "2026-06-06T04:00:00Z"),
    ]);
    expect(s.jobsCount).toBe(1);
    expect(s.totalPayoutCents).toBe(30_000);
  });
});

describe("newStatementCode", () => {
  it("is grouped for reading out loud over a counter", () => {
    expect(newStatementCode()).toMatch(/^[2-9A-Z]{4}-[2-9A-Z]{4}-[2-9A-Z]{4}$/);
  });

  it("never contains the characters people misread", () => {
    for (let i = 0; i < 50; i++) {
      expect(newStatementCode()).not.toMatch(/[01OI]/);
    }
  });

  it("does not repeat", () => {
    const seen = new Set(Array.from({ length: 200 }, newStatementCode));
    expect(seen.size).toBe(200);
  });
});
