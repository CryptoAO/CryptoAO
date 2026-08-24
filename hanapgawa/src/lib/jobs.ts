import { db } from "./db";
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
//                                       client confirms  │  client disputes
//                                                        ▼
//                                    COMPLETED (escrow released)  /  DISPUTED
//
// Money rule: escrow is held at booking, released only at COMPLETED,
// refunded on cancellation before completion. Disputes freeze the hold
// until an admin resolves.

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
  DISPUTED: ["COMPLETED", "CANCELLED"],
};

export function canTransition(from: string, to: string): boolean {
  return (TRANSITIONS[from as JobStatus] ?? []).includes(to as JobStatus);
}

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

    try {
      await escrowHold(tx, jobId, clientId, offer.priceCents);
    } catch (e) {
      if (e instanceof Error && e.message === "INSUFFICIENT_BALANCE") {
        throw new ApiError(402, "Not enough wallet balance — please cash in first");
      }
      throw e;
    }

    await tx.offer.update({ where: { id: offerId }, data: { status: "ACCEPTED" } });
    await tx.offer.updateMany({
      where: { jobId, id: { not: offerId }, status: "PENDING" },
      data: { status: "DECLINED" },
    });

    return tx.job.update({
      where: { id: jobId },
      data: {
        status: "BOOKED",
        assignedProviderId: offer.providerId,
        acceptedOfferId: offerId,
        agreedPriceCents: offer.priceCents,
        takeRateBps: job.category.defaultTakeRateBps,
        escrowHeld: true,
      },
    });
  });
}

export async function startJob(jobId: string, providerId: string) {
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job) throw new ApiError(404, "Job not found");
  if (job.assignedProviderId !== providerId) throw new ApiError(403, "Not your booking");
  if (!canTransition(job.status, "IN_PROGRESS")) throw new ApiError(409, `Cannot start from ${job.status}`);
  return db.job.update({ where: { id: jobId }, data: { status: "IN_PROGRESS" } });
}

export async function markDone(jobId: string, providerId: string) {
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job) throw new ApiError(404, "Job not found");
  if (job.assignedProviderId !== providerId) throw new ApiError(403, "Not your booking");
  if (!canTransition(job.status, "DONE_BY_PROVIDER")) throw new ApiError(409, `Cannot mark done from ${job.status}`);
  return db.job.update({ where: { id: jobId }, data: { status: "DONE_BY_PROVIDER" } });
}

/** Client confirms completion → release escrow (payout + commission). */
export async function confirmComplete(jobId: string, clientId: string) {
  return db.$transaction(async (tx) => {
    const job = await tx.job.findUnique({ where: { id: jobId } });
    if (!job) throw new ApiError(404, "Job not found");
    if (job.clientId !== clientId) throw new ApiError(403, "Only the job owner can confirm");
    if (!canTransition(job.status, "COMPLETED")) throw new ApiError(409, `Cannot complete from ${job.status}`);
    if (!job.escrowHeld || !job.agreedPriceCents || !job.assignedProviderId || job.takeRateBps == null) {
      throw new ApiError(409, "Job has no active escrow");
    }
    const split = await escrowRelease(tx, jobId, job.assignedProviderId, job.agreedPriceCents, job.takeRateBps);
    const updated = await tx.job.update({
      where: { id: jobId },
      data: { status: "COMPLETED", escrowHeld: false, completedAt: new Date() },
    });
    return { job: updated, ...split };
  });
}

/** Cancel: OPEN jobs just close; BOOKED/IN_PROGRESS refund the client. */
export async function cancelJob(jobId: string, byUserId: string, isAdmin = false) {
  return db.$transaction(async (tx) => {
    const job = await tx.job.findUnique({ where: { id: jobId } });
    if (!job) throw new ApiError(404, "Job not found");
    const isClient = job.clientId === byUserId;
    const isProvider = job.assignedProviderId === byUserId;
    if (!isClient && !isProvider && !isAdmin) throw new ApiError(403, "Not your job");
    if (!canTransition(job.status, "CANCELLED")) throw new ApiError(409, `Cannot cancel from ${job.status}`);
    // Provider-initiated cancellation after work started needs support review.
    if (isProvider && job.status === "IN_PROGRESS" && !isAdmin) {
      throw new ApiError(409, "Work already started — open a dispute instead");
    }
    if (job.escrowHeld && job.agreedPriceCents) {
      await escrowRefund(tx, jobId, job.clientId, job.agreedPriceCents);
    }
    return tx.job.update({
      where: { id: jobId },
      data: { status: "CANCELLED", escrowHeld: false },
    });
  });
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
    await tx.dispute.create({ data: { jobId, openedById: byUserId, reason } });
    return tx.job.update({ where: { id: jobId }, data: { status: "DISPUTED" } });
  });
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

    if (resolution === "REFUND_CLIENT") {
      await escrowRefund(tx, job.id, job.clientId, job.agreedPriceCents);
      await tx.job.update({ where: { id: job.id }, data: { status: "CANCELLED", escrowHeld: false } });
    } else if (resolution === "PAY_PROVIDER") {
      await escrowRelease(tx, job.id, job.assignedProviderId, job.agreedPriceCents, job.takeRateBps);
      await tx.job.update({
        where: { id: job.id },
        data: { status: "COMPLETED", escrowHeld: false, completedAt: new Date() },
      });
    } else {
      const half = Math.floor(job.agreedPriceCents / 2);
      const rest = job.agreedPriceCents - half;
      await escrowRefund(tx, job.id, job.clientId, half);
      await escrowRelease(tx, job.id, job.assignedProviderId, rest, job.takeRateBps);
      await tx.job.update({
        where: { id: job.id },
        data: { status: "COMPLETED", escrowHeld: false, completedAt: new Date() },
      });
    }

    return tx.dispute.update({
      where: { id: disputeId },
      data: { status: "RESOLVED", resolution, resolvedAt: new Date() },
    });
  });
}
