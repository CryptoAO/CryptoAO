import { db, moneyTxOptions } from "./db";
import { ApiError } from "./api";
import { escrowHold, escrowRelease, escrowRefund } from "./wallet";

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

    await tx.offer.updateMany({
      where: { jobId, id: { not: offerId }, status: "PENDING" },
      data: { status: "DECLINED" },
    });

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
  return db.job.findUniqueOrThrow({ where: { id: jobId } });
}

export async function markDone(jobId: string, providerId: string) {
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job) throw new ApiError(404, "Job not found");
  if (job.assignedProviderId !== providerId) throw new ApiError(403, "Not your booking");
  if (!canTransition(job.status, "DONE_BY_PROVIDER")) throw new ApiError(409, `Cannot mark done from ${job.status}`);
  const flip = await db.job.updateMany({
    where: { id: jobId, status: job.status },
    data: { status: "DONE_BY_PROVIDER" },
  });
  if (flip.count === 0) throw new ApiError(409, "Job just changed — refresh and try again");
  return db.job.findUniqueOrThrow({ where: { id: jobId } });
}

/** Client confirms completion → release escrow (payout + commission). */
export async function confirmComplete(jobId: string, clientId: string) {
  return db.$transaction(async (tx) => {
    const job = await tx.job.findUnique({ where: { id: jobId } });
    if (!job) throw new ApiError(404, "Job not found");
    if (job.clientId !== clientId) throw new ApiError(403, "Only the job owner can confirm");
    if (job.status === "DISPUTED") throw new ApiError(409, DISPUTE_FROZEN);
    if (!canTransition(job.status, "COMPLETED")) throw new ApiError(409, `Cannot complete from ${job.status}`);
    if (!job.escrowHeld || !job.agreedPriceCents || !job.assignedProviderId || job.takeRateBps == null) {
      throw new ApiError(409, "Job has no active escrow");
    }
    // Atomic guard: exactly one request may release this escrow.
    const flip = await tx.job.updateMany({
      where: { id: jobId, status: job.status, escrowHeld: true },
      data: { status: "COMPLETED", escrowHeld: false, completedAt: new Date() },
    });
    if (flip.count === 0) throw new ApiError(409, "Job was already finalized");

    const split = await escrowRelease(tx, jobId, job.assignedProviderId, job.agreedPriceCents, job.takeRateBps);
    const updated = await tx.job.findUniqueOrThrow({ where: { id: jobId } });
    return { job: updated, ...split };
  }, moneyTxOptions);
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

    void adminId; // recorded via the route's audit log
    return tx.dispute.findUniqueOrThrow({ where: { id: disputeId } });
  }, moneyTxOptions);
}
