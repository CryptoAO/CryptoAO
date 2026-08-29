import { db } from "./db";
import { formatPhp } from "./money";
import { getCity } from "./psgc";

// Job broadcast — the liquidity mechanism.
//
// A marketplace where posted jobs sit unseen is not a marketplace. When a
// client posts, every provider who actually does that work in that city
// hears about it within seconds. This is what turns a directory into a
// place where things get booked.
//
// Bounded on purpose: we cap the fan-out so a busy city cannot generate
// thousands of writes per post, and we rank the shortlist so the cap lands
// on the providers most likely to convert rather than an arbitrary slice.

/** Never notify more than this many providers about one job. */
export const BROADCAST_CAP = 25;

export interface BroadcastResult {
  matched: number;
  notified: number;
}

export async function broadcastNewJob(jobId: string): Promise<BroadcastResult> {
  const job = await db.job.findUnique({
    where: { id: jobId },
    include: { category: true },
  });
  if (!job || job.status !== "OPEN") return { matched: 0, notified: 0 };
  // Never broadcast a private request — defense in depth; the create route
  // already branches, but one future call site must not undo the privacy.
  if (job.visibility === "DIRECT") return { matched: 0, notified: 0 };

  // Candidates: active, verified providers offering this category in this
  // city, who have not opted out — and never the client themselves.
  const candidates = await db.user.findMany({
    where: {
      isProvider: true,
      status: "ACTIVE",
      kycLevel: { gte: 1 },
      notifyNewJobs: true,
      cityCode: job.cityCode,
      id: { not: job.clientId },
      providerCategories: { some: { categoryId: job.categoryId } },
    },
    select: { id: true, kycLevel: true },
    // A wider slice than the cap so ranking has something to choose from.
    take: BROADCAST_CAP * 4,
  });

  if (candidates.length === 0) return { matched: 0, notified: 0 };

  // Rank by rating, then by verification level. A provider with a track
  // record is likelier to bid and likelier to be picked, so if we must
  // truncate, truncate the tail rather than a random subset.
  const ratings = await db.review.groupBy({
    by: ["rateeId"],
    where: { rateeId: { in: candidates.map((c) => c.id) } },
    _avg: { rating: true },
    _count: { rating: true },
  });
  const score = new Map(
    ratings.map((r) => [r.rateeId, (r._avg.rating ?? 0) * Math.min(r._count.rating, 10)]),
  );

  const shortlist = [...candidates]
    .sort((a, b) => (score.get(b.id) ?? 0) - (score.get(a.id) ?? 0) || b.kycLevel - a.kycLevel)
    .slice(0, BROADCAST_CAP);

  const cityName = getCity(job.cityCode)?.name ?? job.cityCode;
  const rate = job.payType === "HOURLY" ? "/hr" : "";

  // One bulk insert rather than N round-trips.
  const created = await db.notification.createMany({
    data: shortlist.map((p) => ({
      userId: p.id,
      type: "JOB_NEARBY",
      title: `Bagong ${job.category.nameTl} sa ${cityName}`,
      body: `"${job.title}" — ${formatPhp(job.budgetCents)}${rate}. Mag-offer na bago pa maunahan.`,
      href: `/jobs/${job.id}`,
      jobId: job.id,
    })),
  });

  return { matched: candidates.length, notified: created.count };
}

/**
 * Invite one specific provider to a job — used when a client rebooks
 * someone they have worked with before. Bypasses ranking entirely.
 */
export async function inviteProvider(jobId: string, providerId: string, clientName: string) {
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job || job.status !== "OPEN") return false;

  const provider = await db.user.findUnique({
    where: { id: providerId },
    select: { id: true, isProvider: true, status: true },
  });
  if (!provider?.isProvider || provider.status !== "ACTIVE") return false;

  await db.notification.create({
    data: {
      userId: providerId,
      type: "JOB_INVITE",
      title: `Hinahanap ka ni ${clientName}!`,
      body: `Gusto ka niyang i-book ulit para sa "${job.title}" — ${formatPhp(job.budgetCents)}.`,
      href: `/jobs/${job.id}`,
      jobId: job.id,
    },
  });
  return true;
}

/**
 * Reliability figures for a provider, shown to clients choosing between
 * offers. Deliberately withheld below a minimum sample: one cancelled job
 * out of one would read as "0% reliable", which is noise, not signal.
 */
export const MIN_JOBS_FOR_RELIABILITY = 3;

export async function providerStats(providerId: string) {
  const [completed, cancelled, repeatRows] = await Promise.all([
    db.job.count({ where: { assignedProviderId: providerId, status: "COMPLETED" } }),
    db.job.count({ where: { assignedProviderId: providerId, status: "CANCELLED" } }),
    db.job.groupBy({
      by: ["clientId"],
      where: { assignedProviderId: providerId, status: "COMPLETED" },
      _count: { clientId: true },
    }),
  ]);

  const finished = completed + cancelled;
  return {
    completedJobs: completed,
    // null until there is enough history to mean anything
    reliabilityPct:
      finished >= MIN_JOBS_FOR_RELIABILITY ? Math.round((completed / finished) * 100) : null,
    repeatClients: repeatRows.filter((r) => r._count.clientId > 1).length,
  };
}
