import { api, ok, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { jobView, offerView } from "@/lib/serialize";
import { providerStats } from "@/lib/matching";
import { checkProviderAvailability } from "@/lib/availability";
import { SUKI_TIERS } from "@/lib/money";

export const GET = api(async (_req, { params }) => {
  const { id } = await params;
  const job = await db.job.findUnique({
    where: { id },
    include: { client: true, provider: true, category: true, offers: { include: { provider: true } } },
  });
  if (!job) throw new ApiError(404, "Job not found");

  const viewer = await getSessionUser();
  const isOwner = viewer?.id === job.clientId;
  const isAssigned = viewer != null && viewer.id === job.assignedProviderId;
  const isAdmin = viewer?.isAdmin ?? false;
  const isDirectTarget = viewer != null && viewer.id === job.directProviderId;

  // A direct request is a private conversation between two people. 404 for
  // everyone else — that it exists at all is information.
  if (job.visibility === "DIRECT" && !isOwner && !isAssigned && !isDirectTarget && !isAdmin) {
    throw new ApiError(404, "Job not found");
  }

  // Offer list is visible to the job owner and admins; a provider sees only
  // their own offer (no undercutting wars, no shill visibility).
  let offers = job.offers;
  if (!isOwner && !isAdmin) {
    offers = viewer ? job.offers.filter((o) => o.providerId === viewer.id) : [];
  }

  // Reliability alongside each offer — the client is choosing a person to
  // let into their home, not just a price.
  const offerStats = await Promise.all(
    offers.map(async (o) => [o.id, await providerStats(o.providerId)] as const),
  );
  const statsById = new Map(offerStats);

  // Suki history: how many jobs each bidder has completed with THIS client.
  // Shown so the fee discount is a visible reward, not a silent ledger line —
  // a loyalty program nobody knows about retains nobody.
  const sukiByOffer = new Map<string, number>();
  if (isOwner || isAdmin) {
    const counts = await Promise.all(
      offers.map(async (o) =>
        [o.id, await db.job.count({
          where: { clientId: job.clientId, assignedProviderId: o.providerId, status: "COMPLETED" },
        })] as const,
      ),
    );
    for (const [oid, n] of counts) sukiByOffer.set(oid, n);
  }

  // Whether each bidder is actually free then. A clash is refused at accept
  // time anyway; showing it here means the client finds out while choosing
  // rather than after pressing the button.
  const availability = new Map<string, { clash: boolean; outsideStatedHours: boolean }>();
  if (job.scheduledAt && (isOwner || isAdmin)) {
    const checks = await Promise.all(
      offers.map(async (o) =>
        [o.id, await checkProviderAvailability(o.providerId, job.scheduledAt, job.durationMin, job.id)] as const,
      ),
    );
    for (const [id, check] of checks) availability.set(id, check);
  }

  return ok({
    job: {
      ...jobView(job, viewer?.id, isAdmin),
      category: { id: job.category.id, slug: job.category.slug, name: job.category.name, nameTl: job.category.nameTl, icon: job.category.icon },
    },
    offers: offers.map((o) => ({
      ...offerView(o),
      providerStats: statsById.get(o.id),
      availability: availability.get(o.id),
      jobsWithYou: sukiByOffer.get(o.id),
      sukiDiscount: (sukiByOffer.get(o.id) ?? 0) >= SUKI_TIERS[SUKI_TIERS.length - 1].jobsTogether,
    })),
    viewerRole: isAdmin ? "admin" : isOwner ? "owner" : isAssigned ? "provider" : isDirectTarget ? "direct-target" : "visitor",
  });
});
