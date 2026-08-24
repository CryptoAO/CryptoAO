import { describe, expect, it, vi, beforeEach } from "vitest";

// The notify helpers own every piece of user-facing notification copy, so
// these tests pin the money formatting and the "never break the caller"
// contract rather than re-testing Prisma.

const created: Record<string, unknown>[] = [];
const failing = { fail: false };

vi.mock("../src/lib/db", () => ({
  db: {
    notification: {
      create: async (args: { data: Record<string, unknown> }) => {
        if (failing.fail) throw new Error("db down");
        created.push(args.data);
        return args.data;
      },
    },
  },
}));

const {
  notify,
  notifyOfferAccepted,
  notifyJobCompleted,
  notifyPayoutDecision,
  notifyMessage,
} = await import("../src/lib/notify");

beforeEach(() => {
  created.length = 0;
  failing.fail = false;
});

describe("notify", () => {
  it("writes a notification row with the fields the feed renders", async () => {
    await notify({ userId: "u1", type: "MESSAGE", title: "t", body: "b", href: "/x", jobId: "j1" });
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ userId: "u1", type: "MESSAGE", title: "t", body: "b", href: "/x", jobId: "j1" });
  });

  it("never throws when the write fails — a lost notification must not roll back a booking", async () => {
    failing.fail = true;
    await expect(notify({ userId: "u1", type: "MESSAGE", title: "t", body: "b" })).resolves.toBeUndefined();
    expect(created).toHaveLength(0);
  });
});

describe("notification copy", () => {
  it("formats the accepted-offer amount as pesos", async () => {
    await notifyOfferAccepted("p1", "j1", "Labada 2 bags", 55000);
    expect(created[0].body).toContain("₱550");
    expect(created[0].href).toBe("/jobs/j1");
  });

  it("puts the provider's actual payout in the completion title", async () => {
    await notifyJobCompleted("p1", "j1", "Linis bahay", 176_00);
    expect(created[0].title).toContain("₱176");
    expect(created[0].href).toBe("/me?tab=wallet");
  });

  it("distinguishes a paid payout from a rejected one", async () => {
    await notifyPayoutDecision("p1", true, 100000);
    await notifyPayoutDecision("p1", false, 100000);
    expect(created[0].type).toBe("PAYOUT_PAID");
    expect(created[1].type).toBe("PAYOUT_REJECTED");
    expect(created[1].body).toContain("₱1,000");
  });

  it("truncates long message previews so the bell stays readable", async () => {
    await notifyMessage("u2", "j1", "Nena", "x".repeat(200));
    const body = created[0].body as string;
    expect(body.length).toBeLessThanOrEqual(91);
    expect(body.endsWith("…")).toBe(true);
  });

  it("leaves short previews intact", async () => {
    await notifyMessage("u2", "j1", "Nena", "Sige po, bukas na lang");
    expect(created[0].body).toBe("Sige po, bukas na lang");
  });
});
