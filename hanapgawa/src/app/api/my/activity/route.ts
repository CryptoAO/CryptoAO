import { api, ok, requireUser } from "@/lib/api";
import { db } from "@/lib/db";
import { jobView, offerView } from "@/lib/serialize";

/** Everything the logged-in user has going on, both sides of the market. */
export const GET = api(async () => {
  const user = await requireUser();

  const [jobsPosted, offersMade, jobsAssigned] = await Promise.all([
    db.job.findMany({
      where: { clientId: user.id },
      include: { provider: true, category: true, offers: { where: { status: "PENDING" } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.offer.findMany({
      where: { providerId: user.id },
      include: { job: { include: { client: true, category: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.job.findMany({
      where: { assignedProviderId: user.id },
      include: { client: true, category: true },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);

  return ok({
    jobsPosted: jobsPosted.map((j) => ({
      ...jobView(j, user.id, user.isAdmin),
      categoryName: j.category.name,
      categoryIcon: j.category.icon,
      pendingOffers: j.offers.length,
    })),
    offersMade: offersMade.map((o) => ({
      ...offerView(o),
      job: { ...jobView(o.job, user.id, user.isAdmin), categoryName: o.job.category.name, categoryIcon: o.job.category.icon },
    })),
    jobsAssigned: jobsAssigned.map((j) => ({
      ...jobView(j, user.id, user.isAdmin),
      categoryName: j.category.name,
      categoryIcon: j.category.icon,
    })),
  });
});
