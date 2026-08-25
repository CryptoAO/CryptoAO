// Escrow auto-release.
//
// The escrow that protects a client is a trap for a provider if it has no
// exit. Somebody scrubs a bathroom for four hours, marks the job done, and
// the client — not malicious, just busy — never presses "confirm". Under the
// original rules that money sits frozen forever and the provider learns that
// working here means chasing people for pay. One bad experience like that
// and they go back to Facebook groups.
//
// So the clock starts when the provider marks the work done:
//
//   done ──(RELEASE_HOURS)──▶ escrow releases automatically
//         └─(WARN_HOURS)──▶ client is nudged: "confirm or raise an issue"
//
// A dispute stops the clock dead — a DISPUTED job is never auto-released,
// because the whole point of a dispute is that a human decides.

import { db } from "./db";
import { autoConfirmComplete } from "./jobs";
import { notifyReleaseSoon } from "./notify";
import { captureError } from "./monitoring";

function hoursFromEnv(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

/** How long a client has to confirm before the money moves on its own. */
export const RELEASE_HOURS = hoursFromEnv("AUTO_RELEASE_HOURS", 72);
/** How long before that we nudge them. */
export const WARN_HOURS = hoursFromEnv("AUTO_RELEASE_WARN_HOURS", 48);

export function releaseDeadline(doneAt: Date): Date {
  return new Date(doneAt.getTime() + RELEASE_HOURS * 3_600_000);
}

export function warnAt(doneAt: Date): Date {
  return new Date(doneAt.getTime() + WARN_HOURS * 3_600_000);
}

interface PendingJob {
  id: string;
  clientId: string;
  title: string;
  autoReleaseAt: Date | null;
  releaseWarnedAt: Date | null;
}

/**
 * Pure selection step, kept separate from the database so the timing rules
 * can be tested without a clock or a fixture.
 */
export function partitionPending<T extends PendingJob>(jobs: T[], now: Date) {
  const release: T[] = [];
  const warn: T[] = [];
  for (const job of jobs) {
    if (!job.autoReleaseAt) continue; // pre-clock booking; a human closes it
    if (job.autoReleaseAt <= now) {
      release.push(job);
      continue;
    }
    const due = new Date(job.autoReleaseAt.getTime() - (RELEASE_HOURS - WARN_HOURS) * 3_600_000);
    if (!job.releaseWarnedAt && due <= now) warn.push(job);
  }
  return { release, warn };
}

export interface SweepResult {
  scanned: number;
  released: number;
  warned: number;
  failed: number;
}

/**
 * One pass of the clock. Safe to run concurrently and safe to run twice:
 * the release itself is guarded by the same atomic state-claim every other
 * money path uses, so a duplicate run loses the race and does nothing.
 */
export async function sweepAutoRelease(now = new Date()): Promise<SweepResult> {
  const pending = await db.job.findMany({
    // DISPUTED is deliberately absent: a dispute freezes the clock.
    where: { status: "DONE_BY_PROVIDER", escrowHeld: true, autoReleaseAt: { not: null } },
    select: { id: true, clientId: true, title: true, autoReleaseAt: true, releaseWarnedAt: true },
    orderBy: { autoReleaseAt: "asc" },
    take: 500,
  });

  const { release, warn } = partitionPending(pending, now);
  const result: SweepResult = { scanned: pending.length, released: 0, warned: 0, failed: 0 };

  for (const job of release) {
    try {
      await autoConfirmComplete(job.id);
      result.released++;
    } catch (e) {
      // One stuck job must not stop the sweep for everyone else.
      result.failed++;
      await captureError(e, { route: "cron/auto-release", extra: { jobId: job.id } });
    }
  }

  for (const job of warn) {
    try {
      // Claim the nudge before sending it so two overlapping sweeps cannot
      // both text the same client.
      const claimed = await db.job.updateMany({
        where: { id: job.id, releaseWarnedAt: null },
        data: { releaseWarnedAt: now },
      });
      if (claimed.count === 0) continue;
      await notifyReleaseSoon(job.clientId, job.id, job.title, job.autoReleaseAt!);
      result.warned++;
    } catch (e) {
      result.failed++;
      await captureError(e, { route: "cron/auto-release", extra: { jobId: job.id, step: "warn" } });
    }
  }

  return result;
}
