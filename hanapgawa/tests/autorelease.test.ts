import { describe, expect, it } from "vitest";
import { RELEASE_HOURS, WARN_HOURS, partitionPending, releaseDeadline, warnAt } from "../src/lib/autorelease";

const H = 3_600_000;
const now = new Date("2026-08-25T12:00:00Z");
const ago = (hours: number) => new Date(now.getTime() - hours * H);

function job(id: string, doneHoursAgo: number, warned: Date | null = null) {
  const doneAt = ago(doneHoursAgo);
  return {
    id,
    clientId: `client-${id}`,
    title: `Job ${id}`,
    autoReleaseAt: releaseDeadline(doneAt),
    releaseWarnedAt: warned,
  };
}

describe("auto-release windows", () => {
  it("warns before it releases, never after", () => {
    expect(WARN_HOURS).toBeLessThan(RELEASE_HOURS);
  });

  it("puts the deadline exactly RELEASE_HOURS after the work was marked done", () => {
    const doneAt = new Date("2026-08-25T09:00:00Z");
    expect(releaseDeadline(doneAt).getTime() - doneAt.getTime()).toBe(RELEASE_HOURS * H);
    expect(warnAt(doneAt).getTime() - doneAt.getTime()).toBe(WARN_HOURS * H);
  });
});

describe("partitionPending", () => {
  it("leaves a fresh job alone — the client still has time", () => {
    const { release, warn } = partitionPending([job("a", 1)], now);
    expect(release).toHaveLength(0);
    expect(warn).toHaveLength(0);
  });

  it("nudges the client once the warning point has passed", () => {
    const { release, warn } = partitionPending([job("b", WARN_HOURS + 1)], now);
    expect(release).toHaveLength(0);
    expect(warn.map((j) => j.id)).toEqual(["b"]);
  });

  it("does not nudge the same client twice", () => {
    const { warn } = partitionPending([job("c", WARN_HOURS + 1, ago(2))], now);
    expect(warn).toHaveLength(0);
  });

  it("releases once the deadline has passed", () => {
    const { release, warn } = partitionPending([job("d", RELEASE_HOURS + 1)], now);
    expect(release.map((j) => j.id)).toEqual(["d"]);
    expect(warn).toHaveLength(0); // already releasing; a nudge would be noise
  });

  it("releases a long-overdue job that was never warned", () => {
    // A sweep that was down for days must still pay people out, not decide
    // they missed their window.
    const { release } = partitionPending([job("e", RELEASE_HOURS * 10)], now);
    expect(release.map((j) => j.id)).toEqual(["e"]);
  });

  it("skips bookings that predate the clock instead of releasing them instantly", () => {
    // Jobs marked done before this feature shipped have no autoReleaseAt. A
    // null must never be read as "overdue" — that would dump every historical
    // escrow at once on the first sweep.
    const legacy = { id: "old", clientId: "c", title: "t", autoReleaseAt: null, releaseWarnedAt: null };
    const { release, warn } = partitionPending([legacy], now);
    expect(release).toHaveLength(0);
    expect(warn).toHaveLength(0);
  });

  it("sorts a mixed batch into the right buckets", () => {
    const batch = [job("fresh", 1), job("warn", WARN_HOURS + 2), job("due", RELEASE_HOURS + 5)];
    const { release, warn } = partitionPending(batch, now);
    expect(release.map((j) => j.id)).toEqual(["due"]);
    expect(warn.map((j) => j.id)).toEqual(["warn"]);
  });
});
