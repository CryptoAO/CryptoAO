// Provider availability.
//
// Providers have always been able to set weekly hours, and the system has
// always ignored them. A promise the UI makes and the code does not keep is
// worse than no promise: the provider believes they are protected from
// 6am bookings, the client believes the grid means something, and the first
// person to find out otherwise is whoever gets stood up.
//
// Two rules, deliberately different in strength:
//
//   1. HARD — nobody can be in two houses at once. A booking that overlaps
//      an existing one is refused outright. This is physics, not preference.
//   2. SOFT — a booking outside stated hours is flagged, not blocked. People
//      take work outside their usual hours all the time, and a marketplace
//      that refuses a job both sides agreed to is just losing them money.
//
// Times are computed in Philippine local time (UTC+8, no DST) because that
// is where every user is and what "Lunes, 8am" means to them.

import { db } from "./db";

/** PH has a single timezone and has not observed DST since 1978. */
export const PH_OFFSET_MIN = 8 * 60;

/** Default assumed length when a job does not say how long it will take. */
export const DEFAULT_DURATION_MIN = 120;

export interface LocalTime {
  weekday: number; // 0 = Sunday
  minutes: number; // minutes from local midnight
}

export function toPhLocal(at: Date): LocalTime {
  const shifted = new Date(at.getTime() + PH_OFFSET_MIN * 60_000);
  return {
    weekday: shifted.getUTCDay(),
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

interface Slot {
  weekday: number;
  startMin: number;
  endMin: number;
}

/**
 * Does the provider's weekly grid cover this whole booking?
 *
 * A booking that runs past midnight is treated as outside stated hours
 * rather than split across two days: someone who wrote "Lunes 8am–5pm" did
 * not mean to consent to an overnight job, and the honest answer to an
 * ambiguous case is the one that warns.
 */
export function isWithinAvailability(slots: Slot[], startsAt: Date, durationMin: number): boolean {
  if (slots.length === 0) return true; // nothing stated, so nothing contradicted
  const start = toPhLocal(startsAt);
  const end = start.minutes + Math.max(durationMin, 1);
  if (end > 24 * 60) return false;
  return slots.some((s) => s.weekday === start.weekday && s.startMin <= start.minutes && s.endMin >= end);
}

export interface Booking {
  id: string;
  scheduledAt: Date | null;
  durationMin: number | null;
}

/** Half-open overlap: a job ending at 10:00 does not clash with one starting at 10:00. */
export function overlaps(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Which existing bookings a proposed one would collide with. Bookings with
 * no scheduled time cannot collide with anything — "flexible, whenever" is
 * not a claim on a particular hour.
 */
export function clashingBookings(
  existing: Booking[],
  startsAt: Date | null,
  durationMin: number | null,
): Booking[] {
  if (!startsAt) return [];
  const start = startsAt.getTime();
  const end = start + (durationMin ?? DEFAULT_DURATION_MIN) * 60_000;
  return existing.filter((b) => {
    if (!b.scheduledAt) return false;
    const bStart = b.scheduledAt.getTime();
    const bEnd = bStart + (b.durationMin ?? DEFAULT_DURATION_MIN) * 60_000;
    return overlaps({ start, end }, { start: bStart, end: bEnd });
  });
}

/** Job states where the provider is genuinely committed to a time. */
const COMMITTED = ["BOOKED", "IN_PROGRESS", "DONE_BY_PROVIDER", "DISPUTED"];

export interface AvailabilityCheck {
  /** A clash with another booking. Blocks the accept. */
  clash: boolean;
  /** Outside the provider's stated hours. Warns only. */
  outsideStatedHours: boolean;
}

export async function checkProviderAvailability(
  providerId: string,
  startsAt: Date | null,
  durationMin: number | null,
  excludeJobId?: string,
): Promise<AvailabilityCheck> {
  if (!startsAt) return { clash: false, outsideStatedHours: false };

  const [slots, committed] = await Promise.all([
    db.availabilitySlot.findMany({
      where: { providerId },
      select: { weekday: true, startMin: true, endMin: true },
    }),
    db.job.findMany({
      where: {
        assignedProviderId: providerId,
        status: { in: COMMITTED },
        scheduledAt: { not: null },
        ...(excludeJobId ? { id: { not: excludeJobId } } : {}),
      },
      select: { id: true, scheduledAt: true, durationMin: true },
    }),
  ]);

  return {
    clash: clashingBookings(committed, startsAt, durationMin).length > 0,
    outsideStatedHours: !isWithinAvailability(slots, startsAt, durationMin ?? DEFAULT_DURATION_MIN),
  };
}
