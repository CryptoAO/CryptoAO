import { api, ok, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { jobView, offerView } from "@/lib/serialize";

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

  // Offer list is visible to the job owner and admins; a provider sees only
  // their own offer (no undercutting wars, no shill visibility).
  let offers = job.offers;
  if (!isOwner && !isAdmin) {
    offers = viewer ? job.offers.filter((o) => o.providerId === viewer.id) : [];
  }

  return ok({
    job: {
      ...jobView(job, viewer?.id, isAdmin),
      category: { id: job.category.id, slug: job.category.slug, name: job.category.name, nameTl: job.category.nameTl, icon: job.category.icon },
    },
    offers: offers.map(offerView),
    viewerRole: isAdmin ? "admin" : isOwner ? "owner" : isAssigned ? "provider" : "visitor",
  });
});
