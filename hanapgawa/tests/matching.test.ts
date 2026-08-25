import { describe, expect, it, vi, beforeEach } from "vitest";

// The broadcast is the marketplace's liquidity mechanism, so the contract
// worth pinning is: only eligible providers are matched, the client is never
// notified about their own post, and the fan-out is bounded.

const state = {
  job: null as Record<string, unknown> | null,
  candidates: [] as { id: string; kycLevel: number }[],
  ratings: [] as { rateeId: string; _avg: { rating: number }; _count: { rating: number } }[],
  lastUserWhere: null as Record<string, unknown> | null,
  createdRows: [] as Record<string, unknown>[],
};

vi.mock("../src/lib/db", () => ({
  db: {
    job: { findUnique: async () => state.job },
    user: {
      findMany: async (args: { where: Record<string, unknown> }) => {
        state.lastUserWhere = args.where;
        return state.candidates;
      },
      findUnique: async () => null,
    },
    review: { groupBy: async () => state.ratings },
    notification: {
      createMany: async (args: { data: Record<string, unknown>[] }) => {
        state.createdRows = args.data;
        return { count: args.data.length };
      },
      create: async () => ({}),
    },
  },
}));

const { broadcastNewJob, BROADCAST_CAP } = await import("../src/lib/matching");

const baseJob = {
  id: "job1",
  status: "OPEN",
  clientId: "client1",
  cityCode: "quezon-city",
  categoryId: "cat-laundry",
  title: "Labada 2 bags",
  budgetCents: 60000,
  payType: "FIXED",
  category: { nameTl: "Labada at Plantsa" },
};

beforeEach(() => {
  state.job = { ...baseJob };
  state.candidates = [];
  state.ratings = [];
  state.createdRows = [];
});

describe("broadcastNewJob", () => {
  it("matches only active, verified, opted-in providers in the job's city and category", async () => {
    state.candidates = [{ id: "p1", kycLevel: 2 }];
    await broadcastNewJob("job1");

    const where = state.lastUserWhere as Record<string, unknown>;
    expect(where.isProvider).toBe(true);
    expect(where.status).toBe("ACTIVE");
    expect(where.notifyNewJobs).toBe(true);
    expect(where.cityCode).toBe("quezon-city");
    expect(where.kycLevel).toEqual({ gte: 1 });
    // never the person who posted it
    expect(where.id).toEqual({ not: "client1" });
    expect(where.providerCategories).toEqual({ some: { categoryId: "cat-laundry" } });
  });

  it("caps the fan-out no matter how many providers match", async () => {
    state.candidates = Array.from({ length: 200 }, (_, i) => ({ id: `p${i}`, kycLevel: 1 }));
    const result = await broadcastNewJob("job1");
    expect(result.notified).toBe(BROADCAST_CAP);
    expect(state.createdRows).toHaveLength(BROADCAST_CAP);
  });

  it("keeps the best-rated providers when it has to truncate", async () => {
    state.candidates = Array.from({ length: BROADCAST_CAP + 1 }, (_, i) => ({ id: `p${i}`, kycLevel: 1 }));
    // p50 is the last candidate and the only one with a strong record
    const star = `p${BROADCAST_CAP}`;
    state.ratings = [{ rateeId: star, _avg: { rating: 5 }, _count: { rating: 10 } }];

    await broadcastNewJob("job1");
    const notifiedIds = state.createdRows.map((r) => r.userId);
    expect(notifiedIds).toContain(star);
  });

  it("does nothing for a job that is no longer open", async () => {
    state.job = { ...baseJob, status: "BOOKED" };
    state.candidates = [{ id: "p1", kycLevel: 2 }];
    const result = await broadcastNewJob("job1");
    expect(result).toEqual({ matched: 0, notified: 0 });
    expect(state.createdRows).toHaveLength(0);
  });

  it("does nothing when no provider covers that work in that city", async () => {
    state.candidates = [];
    const result = await broadcastNewJob("job1");
    expect(result).toEqual({ matched: 0, notified: 0 });
  });

  it("links every notification back to the job", async () => {
    state.candidates = [{ id: "p1", kycLevel: 2 }];
    await broadcastNewJob("job1");
    const row = state.createdRows[0];
    expect(row.type).toBe("JOB_NEARBY");
    expect(row.href).toBe("/jobs/job1");
    expect(row.jobId).toBe("job1");
    expect(String(row.body)).toContain("₱600");
  });
});
