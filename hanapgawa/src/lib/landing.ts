// First-paint data for the public storefront. The feed pages are client
// components (filters, geolocation, pagination), but their FIRST render must
// not be a spinner: crawlers, link unfurlers, and slow phones all judge the
// product by the pre-hydration HTML. These fetchers run in server components
// and hand the client its initial page, so the HTML that leaves the server
// already contains real jobs and providers.
//
// Deliberately the default view only (page 1, no filters, newest first) —
// every other combination stays the client's job via /api/jobs and
// /api/providers.

import { db } from "./db";
import { jobView, publicUser } from "./serialize";

export async function initialJobs(limit = 20) {
  const where = { status: "OPEN", visibility: "PUBLIC" };
  const [total, jobs] = await Promise.all([
    db.job.count({ where }),
    db.job.findMany({
      where,
      include: { client: true, category: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ]);
  return {
    total,
    // Client components receive this over the RSC boundary, so dates must
    // already be strings — the same shape the JSON API produces.
    jobs: jobs.map((j) => ({
      ...JSON.parse(JSON.stringify(jobView(j))),
      category: { id: j.category.id, name: j.category.name, nameTl: j.category.nameTl, icon: j.category.icon },
    })),
  };
}

export async function initialProviders(limit = 20) {
  const where = { isProvider: true, status: "ACTIVE", kycLevel: { gte: 1 } };
  const [total, providers] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      include: { providerCategories: { include: { category: true } } },
      orderBy: [{ kycLevel: "desc" }, { createdAt: "asc" }],
      take: limit,
    }),
  ]);
  const ids = providers.map((u) => u.id);
  const [ratings, completed] = await Promise.all([
    db.review.groupBy({ by: ["rateeId"], where: { rateeId: { in: ids } }, _avg: { rating: true }, _count: { rating: true } }),
    db.job.groupBy({ by: ["assignedProviderId"], where: { assignedProviderId: { in: ids }, status: "COMPLETED" }, _count: { _all: true } }),
  ]);
  const ratingMap = new Map(ratings.map((r) => [r.rateeId, r]));
  const completedMap = new Map(completed.map((c) => [c.assignedProviderId, c._count._all]));
  return {
    total,
    providers: providers.map((u) => ({
      ...publicUser(u),
      categories: u.providerCategories.map((pc) => ({
        categoryId: pc.categoryId,
        name: pc.category.name,
        nameTl: pc.category.nameTl,
        icon: pc.category.icon,
        headline: pc.headline,
        rateCents: pc.rateCents,
        rateUnit: pc.rateUnit,
        yearsExp: pc.yearsExp,
      })),
      ratingAvg: ratingMap.get(u.id)?._avg.rating ?? null,
      ratingCount: ratingMap.get(u.id)?._count.rating ?? 0,
      completedJobs: completedMap.get(u.id) ?? 0,
    })),
  };
}
