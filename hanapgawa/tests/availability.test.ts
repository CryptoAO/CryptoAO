import { describe, expect, it } from "vitest";
import {
  DEFAULT_DURATION_MIN,
  PH_OFFSET_MIN,
  clashingBookings,
  isWithinAvailability,
  overlaps,
  toPhLocal,
} from "../src/lib/availability";

// 2026-08-24T00:00Z is Monday 08:00 in Manila.
const monday8am = new Date("2026-08-24T00:00:00Z");

describe("toPhLocal", () => {
  it("reads a UTC instant as the Philippine wall clock", () => {
    expect(PH_OFFSET_MIN).toBe(480);
    const t = toPhLocal(monday8am);
    expect(t.weekday).toBe(1); // Monday
    expect(t.minutes).toBe(8 * 60);
  });

  it("rolls the weekday forward when the offset crosses midnight", () => {
    // Sunday 17:00 UTC is Monday 01:00 in Manila — a job booked "Sunday
    // evening" from a server's point of view is Monday to the provider.
    const t = toPhLocal(new Date("2026-08-23T17:00:00Z"));
    expect(t.weekday).toBe(1);
    expect(t.minutes).toBe(60);
  });
});

describe("isWithinAvailability", () => {
  const monday9to5 = [{ weekday: 1, startMin: 9 * 60, endMin: 17 * 60 }];

  it("treats an empty grid as no constraint, not as unavailable", () => {
    // Refusing everyone who never opened the availability screen would break
    // the app for most new providers.
    expect(isWithinAvailability([], monday8am, 120)).toBe(true);
  });

  it("accepts a booking that fits inside a slot", () => {
    const tenAm = new Date("2026-08-24T02:00:00Z");
    expect(isWithinAvailability(monday9to5, tenAm, 120)).toBe(true);
  });

  it("rejects a booking that starts before the slot", () => {
    expect(isWithinAvailability(monday9to5, monday8am, 60)).toBe(false);
  });

  it("rejects a booking that runs past the end of the slot", () => {
    const fourPm = new Date("2026-08-24T08:00:00Z");
    expect(isWithinAvailability(monday9to5, fourPm, 120)).toBe(false);
  });

  it("accepts one that ends exactly on the boundary", () => {
    const threePm = new Date("2026-08-24T07:00:00Z");
    expect(isWithinAvailability(monday9to5, threePm, 120)).toBe(true);
  });

  it("rejects a booking on a different day", () => {
    const tuesday10am = new Date("2026-08-25T02:00:00Z");
    expect(isWithinAvailability(monday9to5, tuesday10am, 60)).toBe(false);
  });

  it("treats an overnight booking as outside stated hours", () => {
    // "Lunes 9am-5pm" is not consent to an overnight job.
    const elevenPm = new Date("2026-08-24T15:00:00Z");
    const allMonday = [{ weekday: 1, startMin: 0, endMin: 24 * 60 }];
    expect(isWithinAvailability(allMonday, elevenPm, 180)).toBe(false);
  });
});

describe("overlaps", () => {
  it("does not clash when one ends exactly as the other begins", () => {
    expect(overlaps({ start: 0, end: 10 }, { start: 10, end: 20 })).toBe(false);
  });

  it("clashes on any real intersection, in either order", () => {
    expect(overlaps({ start: 0, end: 10 }, { start: 5, end: 20 })).toBe(true);
    expect(overlaps({ start: 5, end: 20 }, { start: 0, end: 10 })).toBe(true);
  });

  it("clashes when one contains the other", () => {
    expect(overlaps({ start: 0, end: 100 }, { start: 20, end: 30 })).toBe(true);
  });
});

describe("clashingBookings", () => {
  const at = (iso: string, durationMin: number | null = 120) => ({
    id: iso,
    scheduledAt: new Date(iso),
    durationMin,
  });

  it("finds the booking a new one would collide with", () => {
    const found = clashingBookings([at("2026-08-24T01:00:00Z")], new Date("2026-08-24T02:00:00Z"), 60);
    expect(found).toHaveLength(1);
  });

  it("allows a booking that starts when the previous one ends", () => {
    const found = clashingBookings([at("2026-08-24T00:00:00Z", 60)], new Date("2026-08-24T01:00:00Z"), 60);
    expect(found).toHaveLength(0);
  });

  it("ignores existing bookings with no scheduled time", () => {
    // "Flexible, whenever" is not a claim on a particular hour.
    const found = clashingBookings(
      [{ id: "flex", scheduledAt: null, durationMin: 120 }],
      new Date("2026-08-24T02:00:00Z"),
      60,
    );
    expect(found).toHaveLength(0);
  });

  it("never blocks a new booking that has no scheduled time itself", () => {
    const found = clashingBookings([at("2026-08-24T01:00:00Z")], null, 60);
    expect(found).toHaveLength(0);
  });

  it("assumes a default length rather than treating unknown as instantaneous", () => {
    // A job with no stated duration must still occupy the calendar, or every
    // untimed job silently becomes a zero-minute booking nothing clashes with.
    const found = clashingBookings(
      [at("2026-08-24T00:00:00Z", null)],
      new Date(new Date("2026-08-24T00:00:00Z").getTime() + (DEFAULT_DURATION_MIN - 30) * 60_000),
      30,
    );
    expect(found).toHaveLength(1);
  });

  it("returns every clash, not just the first", () => {
    const found = clashingBookings(
      [at("2026-08-24T01:00:00Z", 240), at("2026-08-24T02:00:00Z", 60)],
      new Date("2026-08-24T02:00:00Z"),
      60,
    );
    expect(found).toHaveLength(2);
  });
});
