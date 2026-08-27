// Direct booking: the request-to-book flow.
//
// Until now the only path to a booking was posting publicly and waiting for
// offers — fine for "anyone who can iron", wrong for "I want Aling Nena,
// Tuesday, 2pm". A direct request aims a job at one provider: it never
// appears in the feed, is never broadcast, and only that provider can see
// it. Their single confirmation books it and holds escrow from the client —
// the Airbnb request-to-book shape, on our existing money rails.
//
// The consent that makes one-tap confirmation legitimate is collected at
// REQUEST time: the client states a price and is told plainly that the
// moment the provider confirms, that amount is held from their wallet. A
// confirmation is therefore not the provider taking the client's money; it
// is the client's own standing instruction being executed.

import { db, moneyTxOptions } from "./db";
import { ApiError } from "./api";
import { escrowHold } from "./wallet";
import { sukiTakeRateBps, HIGH_VALUE_CENTS } from "./money";
import { DEFAULT_DURATION_MIN, clashingBookings } from "./availability";
import { notify } from "./notify";

/** A request the provider has not answered goes stale after this long. */
export const DIRECT_REQUEST_TTL_HOURS = 48;

/**
 * Provider confirms a direct request → the job books, escrow holds.
 *
 * Deliberately parallel to acceptOffer() rather than shared with it: the
 * checks differ in who is acting and what they may act on, and a money path
 * you can read top-to-bottom beats one you have to trace through role flags.
 * The invariants are the same ones: atomic state-claim, suki rate frozen at
 * booking, clash check inside the transaction, Serializable on Postgres.
 */
export async function confirmDirectJob(jobId: string, providerId: string) {
  return db.$transaction(async (tx) => {
    const job = await tx.job.findUnique({ where: { id: jobId }, include: { category: true } });
    if (!job || job.visibility !== "DIRECT" || job.directProviderId !== providerId) {
      // 404, not 403: whether the request exists is itself information.
      throw new ApiError(404, "Request not found");
    }
    if (job.status !== "OPEN") throw new ApiError(409, "Hindi na aktibo ang request na ito");

    const provider = await tx.user.findUnique({ where: { id: providerId } });
    if (!provider || provider.status !== "ACTIVE" || !provider.isProvider) {
      throw new ApiError(409, "Hindi ka na pwedeng tumanggap ng booking ngayon");
    }
    if (job.budgetCents >= HIGH_VALUE_CENTS && provider.kycLevel < 2) {
      throw new ApiError(409, "Kailangan ng verified ID para sa trabahong ₱2,000 pataas");
    }

    // Nobody can be in two houses at once — same rule as a public accept.
    if (job.scheduledAt) {
      const committed = await tx.job.findMany({
        where: {
          assignedProviderId: providerId,
          status: { in: ["BOOKED", "IN_PROGRESS", "DONE_BY_PROVIDER", "DISPUTED"] },
          scheduledAt: { not: null },
          id: { not: jobId },
        },
        select: { id: true, scheduledAt: true, durationMin: true },
      });
      if (clashingBookings(committed, job.scheduledAt, job.durationMin ?? DEFAULT_DURATION_MIN).length > 0) {
        throw new ApiError(409, "May booking ka na sa oras na iyan — i-decline na lang ito o kausapin ang client");
      }
    }

    const completedTogether = await tx.job.count({
      where: { clientId: job.clientId, assignedProviderId: providerId, status: "COMPLETED" },
    });
    const takeRateBps = sukiTakeRateBps(job.category.defaultTakeRateBps, completedTogether);

    // The record of what was agreed, in the same shape a public booking has,
    // so downstream code (reviews, disputes, stats) sees no difference.
    const offer = await tx.offer.create({
      data: { jobId, providerId, priceCents: job.budgetCents, message: "Direktang booking", status: "ACCEPTED" },
    });

    const flip = await tx.job.updateMany({
      where: { id: jobId, status: "OPEN" },
      data: {
        status: "BOOKED",
        assignedProviderId: providerId,
        acceptedOfferId: offer.id,
        agreedPriceCents: job.budgetCents,
        takeRateBps,
        escrowHeld: true,
      },
    });
    if (flip.count === 0) throw new ApiError(409, "Kakabago lang ng request na ito — i-refresh");

    try {
      await escrowHold(tx, jobId, job.clientId, job.budgetCents);
    } catch (e) {
      if (e instanceof Error && e.message === "INSUFFICIENT_BALANCE") {
        // The transaction rolls back — the request stays OPEN, and the
        // client is told exactly what to do. The provider's confirmation is
        // not lost; they can tap again once the wallet is funded.
        await notify({
          userId: job.clientId,
          type: "DIRECT_CONFIRMED",
          title: "Kulang ang wallet mo para matuloy",
          body: `Gustong tanggapin ang "${job.title}" pero kulang ang laman ng wallet mo. Mag-cash in para ma-book.`,
          href: "/me?tab=wallet",
          jobId,
        });
        throw new ApiError(402, "Kulang ang wallet ng client — sinabihan na namin sila. Subukan ulit mamaya.");
      }
      throw e;
    }

    await notify({
      userId: job.clientId,
      type: "DIRECT_CONFIRMED",
      title: "Kinumpirma ang booking mo!",
      body: `Tinanggap ni ${provider.firstName} ang "${job.title}". Naka-hold na ang bayad sa escrow.`,
      href: `/jobs/${jobId}`,
      jobId,
      tx,
    });

    return tx.job.findUniqueOrThrow({ where: { id: jobId } });
  }, moneyTxOptions);
}

/** Provider declines a direct request. No money has moved; the job closes. */
export async function declineDirectJob(jobId: string, providerId: string) {
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job || job.visibility !== "DIRECT" || job.directProviderId !== providerId) {
    throw new ApiError(404, "Request not found");
  }
  if (job.status !== "OPEN") throw new ApiError(409, "Hindi na aktibo ang request na ito");

  const flip = await db.job.updateMany({
    where: { id: jobId, status: "OPEN" },
    data: { status: "CANCELLED" },
  });
  if (flip.count === 0) throw new ApiError(409, "Kakabago lang ng request na ito");

  await notify({
    userId: job.clientId,
    type: "DIRECT_DECLINED",
    title: "Hindi natuloy ang booking request",
    body: `Hindi matatanggap ang "${job.title}" sa ngayon. Subukan ang ibang provider — o i-post ito sa lahat.`,
    href: `/jobs/new`,
    jobId,
  });
  return db.job.findUniqueOrThrow({ where: { id: jobId } });
}

export interface ExpireResult {
  scanned: number;
  expired: number;
}

/**
 * Expire direct requests nobody answered. A request that silently rots is
 * the failure mode of request-to-book — the client waits on someone who
 * will never reply instead of posting publicly. Runs on the cron tick.
 */
export async function expireDirectRequests(now = new Date()): Promise<ExpireResult> {
  const cutoff = new Date(now.getTime() - DIRECT_REQUEST_TTL_HOURS * 3_600_000);
  const stale = await db.job.findMany({
    where: { visibility: "DIRECT", status: "OPEN", createdAt: { lt: cutoff } },
    select: { id: true, clientId: true, directProviderId: true, title: true },
    take: 200,
  });

  let expired = 0;
  for (const job of stale) {
    const flip = await db.job.updateMany({ where: { id: job.id, status: "OPEN" }, data: { status: "CANCELLED" } });
    if (flip.count === 0) continue;
    expired++;
    await notify({
      userId: job.clientId,
      type: "DIRECT_EXPIRED",
      title: "Walang sagot ang booking request mo",
      body: `Hindi nasagot ang "${job.title}" sa loob ng ${DIRECT_REQUEST_TTL_HOURS} oras, kaya isinara na namin ito. I-post ito sa lahat para makakuha ng offers.`,
      href: "/jobs/new",
      jobId: job.id,
    });
    if (job.directProviderId) {
      await notify({
        userId: job.directProviderId,
        type: "DIRECT_EXPIRED",
        title: "Nag-expire ang isang booking request",
        body: `Hindi mo nasagot ang "${job.title}" kaya napunta na ito sa iba. Sagutin agad ang mga request para hindi ka lumagpas.`,
        href: "/me",
        jobId: job.id,
      });
    }
  }
  return { scanned: stale.length, expired };
}
