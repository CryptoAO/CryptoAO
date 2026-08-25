import { db, moneyTxOptions } from "./db";
import { ApiError } from "./api";
import { escrowHold, escrowRelease, escrowRefund } from "./wallet";
import {
  notifyOfferAccepted, notifyOfferDeclined, notifyJobStarted, notifyJobDone,
  notifyJobCompleted, notifyJobCancelled, notifyDisputeOpened, notifyDisputeResolved,
  notifyAutoReleased,
} from "./notify";
import { releaseDeadline } from "./autorelease";
import { DEFAULT_DURATION_MIN, clashingBookings } from "./availability";

// Job lifecycle (single source of truth):
//
//   OPEN ──accept offer──▶ BOOKED ──provider starts──▶ IN_PROGRESS
//     │                      │                            │
//     │                      │                     provider marks done
//     │                      ▼                            ▼
//     └─▶ CANCELLED   CANCELLED (refund)          DONE_BY_PROVIDER
//                                                        │
//                                       client confirms  │  either party disputes
//                                                        ▼
//                                    COMPLETED (escrow released)  /  DISPUTED
//
// Money rules:
// - Escrow is held at booking, released only at COMPLETED, refunded on
//   cancellation before completion.
// - A DISPUTED job is frozen: neither party can cancel or complete it.
//   The ONLY exit from DISPUTED is an admin's resolveDispute().
// - Every money-moving transition is guarded by an atomic conditional
//   update (updateMany with a status precondition) so concurrent requests
//   cannot double-release or double-refund; on Postgres the transactions
//   additionally run at Serializable isolation (see moneyTxOptions).

export const JOB_STATUSES = [
  "OPEN",
  "BOOKED",
  "IN_PROGRESS",
  "DONE_BY_PROVIDER",
  "COMPLETED",
  "CANCELLED",
  "DISPUTED",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

const TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  OPEN: ["BOOKED", "CANCELLED"],
  BOOKED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["DONE_BY_PROVIDER", "DISPUTED", "CANCELLED"],
  DONE_BY_PROVIDER: ["COMPLETED", "DISPUTED"],
  COMPLETED: [],
  CANCELLED: [],
  DISPUTED: ["COMPLETED", "CANCELLED"], // reachable ONLY via resolveDispute()
};

export function canTransition(from: string, to: string): boolean {
  return (TRANSITIONS[from as JobStatus] ?? []).includes(to as JobStatus);
}

const DISPUTE_FROZEN = "This job is in dispute — support will resolve it";

/** Client accepts an offer: freeze price + take rate, hold escrow, book. */
export async function acceptOffer(jobId: string, offerId: string, clientId: string) {
  return db.$transaction(async (tx) => {
    const job = await tx.job.findUnique({ where: { id: jobId }, include: { category: true } });
    if (!job) throw new ApiError(404, "Job not found");
    if (job.clientId !== clientId) throw new ApiError(403, "Only the job owner can accept offers");
    if (job.status !== "OPEN") throw new ApiError(409, "This job is no longer open");

    const offer = await tx.offer.findUnique({ where: { id: offerId } });
    if (!offer || offer.jobId !== jobId) throw new ApiError(404, "Offer not found");
    if (offer.status !== "PENDING") throw new ApiError(409, "Offer is no longer available");

    const provider = await tx.user.findUnique({ where: { id: offer.providerId } });
    if (!provider || provider.status !== "ACTIVE" || !provider.isProvider) {
      throw new ApiError(409, "This provider is no longer available");
    }

    // Nobody can be in two houses at once. Checked inside the transaction so
    // two clients accepting the same provider for the same hour cannot both
    // win the race — the second one sees the first one's booking.
    //
    // Only a hard clash blocks. Booking outside the provider's stated hours
    // is surfaced in the UI as a warning instead: people take work outside
    // their usual hours all the time, and refusing a job both sides agreed
    // to would just lose everyone money.
    if (job.scheduledAt) {
      const committed = await tx.job.findMany({
        where: {
          assignedProviderId: offer.providerId,
          status: { in: ["BOOKED", "IN_PROGRESS", "DONE_BY_PROVIDER", "DISPUTED"] },
          scheduledAt: { not: null },
          id: { not: jobId },
        },
        select: { id: true, scheduledAt: true, durationMin: true },
      });
      if (clashingBookings(committed, job.scheduledAt, job.durationMin ?? DEFAULT_DURATION_MIN).length > 0) {
        throw new ApiError(409, "May booking na si provider sa oras na iyan. Pumili ng ibang oras o ibang provider.");
      }
    }

    // Atomic gates: under concurrent accepts only one request wins each flip.
    const jobFlip = await tx.job.updateMany({
      where: { id: jobId, status: "OPEN" },
      data: {
        status: "BOOKED",
        assignedProviderId: offer.providerId,
        acceptedOfferId: offerId,
        agreedPriceCents: offer.priceCents,
        takeRateBps: job.category.defaultTakeRateBps,
        escrowHeld: true,
      },
    });
    if (jobFlip.count === 0) throw new ApiError(409, "This job is no longer open");

    const offerFlip = await tx.offer.updateMany({
      where: { id: offerId, status: "PENDING" },
      data: { status: "ACCEPTED" },
    });
    if (offerFlip.count === 0) throw new ApiError(409, "Offer is no longer available");

    try {
      await escrowHold(tx, jobId, clientId, offer.priceCents);
    } catch (e) {
      if (e instanceof Error && e.message === "INSUFFICIENT_BALANCE") {
        throw new ApiError(402, "Not enough wallet balance — please cash in first");
      }
      throw e;
    }

    const losers = await tx.offer.findMany({
      where: { jobId, id: { not: offerId }, status: "PENDING" },
      select: { providerId: true },
    });
    await tx.offer.updateMany({
      where: { jobId, id: { not: offerId }, status: "PENDING" },
      data: { status: "DECLINED" },
    });

    await notifyOfferAccepted(offer.providerId, jobId, job.title, offer.priceCents, tx);
    for (const l of losers) await notifyOfferDeclined(l.providerId, jobId, job.title, tx);

    return tx.job.findUniqueOrThrow({ where: { id: jobId } });
  }, moneyTxOptions);
}

export async function startJob(jobId: string, providerId: string) {
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job) throw new ApiError(404, "Job not found");
  if (job.assignedProviderId !== providerId) throw new ApiError(403, "Not your booking");
  if (!canTransition(job.status, "IN_PROGRESS")) throw new ApiError(409, `Cannot start from ${job.status}`);
  const flip = await db.job.updateMany({
    where: { id: jobId, status: job.status },
    data: { status: "IN_PROGRESS" },
  });
  if (flip.count === 0) throw new ApiError(409, "Job just changed — refresh and try again");
  const provider = await db.user.findUnique({ where: { id: providerId }, select: { firstName: true } });
  await notifyJobStarted(job.clientId, jobId, job.title, provider?.firstName ?? "Ang provider");
  return db.job.findUniqueOrThrow({ where: { id: jobId } });
}

export async function markDone(jobId: string, providerId: string) {
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job) throw new ApiError(404, "Job not found");
  if (job.assignedProviderId !== providerId) throw new ApiError(403, "Not your booking");
  if (!canTransition(job.status, "DONE_BY_PROVIDER")) throw new ApiError(409, `Cannot mark done from ${job.status}`);
  // Starting the auto-release clock here, in the same write that flips the
  // status, is what stops a provider's pay from hanging on a client
  // remembering to press a button. See src/lib/autorelease.ts.
  const doneAt = new Date();
  const flip = await db.job.updateMany({
    where: { id: jobId, status: job.status },
    data: { status: "DONE_BY_PROVIDER", doneAt, autoReleaseAt: releaseDeadline(doneAt), releaseWarnedAt: null },
  });
  if (flip.count === 0) throw new ApiError(409, "Job just changed — refresh and try again");
  const doneBy = await db.user.findUnique({ where: { id: providerId }, select: { firstName: true } });
  await notifyJobDone(job.clientId, jobId, job.title, doneBy?.firstName ?? "Ang provider");
  return db.job.findUniqueOrThrow({ where: { id: jobId } });
}

/**
 * Release escrow to the provider. Two actors can trigger this and they get
 * the same money path on purpose — the only differences are who is allowed
 * to ask and who gets told afterwards.
 */
async function releaseEscrow(jobId: string, actor: { kind: "client"; clientId: string } | { kind: "auto" }) {
  return db.$transaction(async (tx) => {
    const job = await tx.job.findUnique({ where: { id: jobId } });
    if (!job) throw new ApiError(404, "Job not found");
    if (actor.kind === "client" && job.clientId !== actor.clientId) {
      throw new ApiError(403, "Only the job owner can confirm");
    }
    // A dispute freezes the money for both the client and the clock. Only
    // resolveDispute() can move it after that.
    if (job.status === "DISPUTED") throw new ApiError(409, DISPUTE_FROZEN);
    if (actor.kind === "auto" && job.status !== "DONE_BY_PROVIDER") {
      throw new ApiError(409, `Cannot auto-release from ${job.status}`);
    }
    if (!canTransition(job.status, "COMPLETED")) throw new ApiError(409, `Cannot complete from ${job.status}`);
    if (!job.escrowHeld || !job.agreedPriceCents || !job.assignedProviderId || job.takeRateBps == null) {
      throw new ApiError(409, "Job has no active escrow");
    }
    // Atomic guard: exactly one request may release this escrow. This is also
    // what makes the sweep safe to run twice or in parallel — a duplicate
    // simply loses the race.
    const flip = await tx.job.updateMany({
      where: { id: jobId, status: job.status, escrowHeld: true },
      data: {
        status: "COMPLETED",
        escrowHeld: false,
        completedAt: new Date(),
        autoReleased: actor.kind === "auto",
      },
    });
    if (flip.count === 0) throw new ApiError(409, "Job was already finalized");

    const split = await escrowRelease(tx, jobId, job.assignedProviderId, job.agreedPriceCents, job.takeRateBps);
    await notifyJobCompleted(job.assignedProviderId, jobId, job.title, split.payoutCents, tx);
    if (actor.kind === "auto") {
      // Tell the client too. Money moving without them touching anything is
      // exactly the kind of surprise that turns into a support ticket.
      await notifyAutoReleased(job.clientId, jobId, job.title, tx);
    }
    const updated = await tx.job.findUniqueOrThrow({ where: { id: jobId } });
    return { job: updated, ...split };
  }, moneyTxOptions);
}

/** Client confirms completion → release escrow (payout + commission). */
export async function confirmComplete(jobId: string, clientId: string) {
  return releaseEscrow(jobId, { kind: "client", clientId });
}

/**
 * The clock confirms on the client's behalf after they have gone quiet past
 * the deadline. Called only from the auto-release sweep.
 */
export async function autoConfirmComplete(jobId: string) {
  return releaseEscrow(jobId, { kind: "auto" });
}

/** Cancel: OPEN jobs just close; BOOKED/IN_PROGRESS refund the client. */
export async function cancelJob(jobId: string, byUserId: string, isAdmin = false) {
  return db.$transaction(async (tx) => {
    const job = await tx.job.findUnique({ where: { id: jobId } });
    if (!job) throw new ApiError(404, "Job not found");
    const isClient = job.clientId === byUserId;
    const isProvider = job.assignedProviderId === byUserId;
    if (!isClient && !isProvider && !isAdmin) throw new ApiError(403, "Not your job");
    // Disputes are frozen for BOTH parties — only resolveDispute() can close
    // them. Without this, a client could dispute-then-cancel to claw back the
    // full escrow after the work is done.
    if (job.status === "DISPUTED") throw new ApiError(409, DISPUTE_FROZEN);
    if (!canTransition(job.status, "CANCELLED")) throw new ApiError(409, `Cannot cancel from ${job.status}`);
    // Provider-initiated cancellation after work started needs support review.
    if (isProvider && !isClient && job.status === "IN_PROGRESS" && !isAdmin) {
      throw new ApiError(409, "Work already started — open a dispute instead");
    }

    // Atomic guard: exactly one cancel wins; a concurrent complete/cancel loses.
    const flip = await tx.job.updateMany({
      where: { id: jobId, status: job.status },
      data: { status: "CANCELLED", escrowHeld: false },
    });
    if (flip.count === 0) throw new ApiError(409, "Job just changed — refresh and try again");

    if (job.escrowHeld && job.agreedPriceCents) {
      await escrowRefund(tx, jobId, job.clientId, job.agreedPriceCents);
    }
    // Tell whoever did not press the button.
    const other = byUserId === job.clientId ? job.assignedProviderId : job.clientId;
    if (other) await notifyJobCancelled(other, jobId, job.title, tx);
    return tx.job.findUniqueOrThrow({ where: { id: jobId } });
  }, moneyTxOptions);
}

/** Either party can open a dispute; freezes escrow until admin resolution. */
export async function openDispute(jobId: string, byUserId: string, reason: string) {
  return db.$transaction(async (tx) => {
    const job = await tx.job.findUnique({ where: { id: jobId } });
    if (!job) throw new ApiError(404, "Job not found");
    if (job.clientId !== byUserId && job.assignedProviderId !== byUserId) {
      throw new ApiError(403, "Not your job");
    }
    if (!canTransition(job.status, "DISPUTED")) throw new ApiError(409, `Cannot dispute from ${job.status}`);
    const flip = await tx.job.updateMany({
      where: { id: jobId, status: job.status },
      data: { status: "DISPUTED" },
    });
    if (flip.count === 0) throw new ApiError(409, "Job just changed — refresh and try again");
    await tx.dispute.create({ data: { jobId, openedById: byUserId, reason } });
    const other = byUserId === job.clientId ? job.assignedProviderId : job.clientId;
    if (other) await notifyDisputeOpened(other, jobId, job.title, tx);
    return tx.job.findUniqueOrThrow({ where: { id: jobId } });
  }, moneyTxOptions);
}

/** Admin resolves a dispute: refund client, pay provider, or 50/50 split. */
export async function resolveDispute(
  disputeId: string,
  adminId: string,
  resolution: "REFUND_CLIENT" | "PAY_PROVIDER" | "SPLIT",
) {
  return db.$transaction(async (tx) => {
    const dispute = await tx.dispute.findUnique({ where: { id: disputeId }, include: { job: true } });
    if (!dispute) throw new ApiError(404, "Dispute not found");
    if (dispute.status !== "OPEN") throw new ApiError(409, "Dispute already resolved");
    const job = dispute.job;
    if (job.status !== "DISPUTED") throw new ApiError(409, "Job is not in dispute");
    if (!job.escrowHeld || !job.agreedPriceCents || !job.assignedProviderId || job.takeRateBps == null) {
      throw new ApiError(409, "No escrow to resolve");
    }

    // Atomic guards: claim the dispute, then the job's escrow, exactly once.
    const claim = await tx.dispute.updateMany({
      where: { id: disputeId, status: "OPEN" },
      data: { status: "RESOLVED", resolution, resolvedAt: new Date() },
    });
    if (claim.count === 0) throw new ApiError(409, "Dispute already resolved");

    const toStatus = resolution === "REFUND_CLIENT" ? "CANCELLED" : "COMPLETED";
    const flip = await tx.job.updateMany({
      where: { id: job.id, status: "DISPUTED", escrowHeld: true },
      data: {
        status: toStatus,
        escrowHeld: false,
        ...(toStatus === "COMPLETED" ? { completedAt: new Date() } : {}),
      },
    });
    if (flip.count === 0) throw new ApiError(409, "Job was already finalized");

    if (resolution === "REFUND_CLIENT") {
      await escrowRefund(tx, job.id, job.clientId, job.agreedPriceCents);
    } else if (resolution === "PAY_PROVIDER") {
      await escrowRelease(tx, job.id, job.assignedProviderId, job.agreedPriceCents, job.takeRateBps);
    } else {
      const half = Math.floor(job.agreedPriceCents / 2);
      const rest = job.agreedPriceCents - half;
      await escrowRefund(tx, job.id, job.clientId, half);
      await escrowRelease(tx, job.id, job.assignedProviderId, rest, job.takeRateBps);
    }

    const outcome =
      resolution === "REFUND_CLIENT"
        ? "Naibalik sa client ang buong bayad."
        : resolution === "PAY_PROVIDER"
          ? "Nabayaran ang provider nang buo."
          : "Hinati sa kalahati ang bayad.";
    await notifyDisputeResolved(job.clientId, job.id, job.title, outcome, tx);
    await notifyDisputeResolved(job.assignedProviderId, job.id, job.title, outcome, tx);

    void adminId; // recorded via the route's audit log
    return tx.dispute.findUniqueOrThrow({ where: { id: disputeId } });
  }, moneyTxOptions);
}
