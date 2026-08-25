import { NextRequest } from "next/server";
import { api, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { publicUser } from "@/lib/serialize";
import { DEFAULT_DURATION_MIN, clashingBookings, isWithinAvailability } from "@/lib/availability";

const PAGE_SIZE = 20;

/** Browse providers by region/city/category with rating summary. */
export const GET = api(async (req: NextRequest) => {
  const p = req.nextUrl.searchParams;
  const regionCode = p.get("region") ?? undefined;
  const cityCode = p.get("city") ?? undefined;
  const categoryId = p.get("category") ?? undefined;
  const page = Math.max(1, Math.min(100, Number(p.get("page") ?? 1) || 1));
  // "Sinong bakante sa oras na ito?" — an ISO datetime. Providers whose
  // stated hours cover the window AND who have no committed booking then.
  const atRaw = p.get("at");
  const at = atRaw && Number.isFinite(Date.parse(atRaw)) ? new Date(atRaw) : null;

  const where = {
    isProvider: true,
    status: "ACTIVE",
    kycLevel: { gte: 1 },
    ...(regionCode ? { regionCode } : {}),
    ...(cityCode ? { cityCode } : {}),
    ...(categoryId ? { providerCategories: { some: { categoryId } } } : {}),
  };

  const [total, providers] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      include: { providerCategories: { include: { category: true } } },
      orderBy: [{ kycLevel: "desc" }, { createdAt: "asc" }],
      // With a time filter we over-fetch and filter in memory: availability
      // is a computation over two tables, not a where-clause. The window is
      // a few pages of candidates, which is nothing at this scale.
      take: at ? PAGE_SIZE * 5 : PAGE_SIZE,
      skip: at ? 0 : (page - 1) * PAGE_SIZE,
    }),
  ]);

  let visible = providers;
  if (at) {
    const candidateIds = providers.map((u) => u.id);
    const [slots, committed] = await Promise.all([
      db.availabilitySlot.findMany({
        where: { providerId: { in: candidateIds } },
        select: { providerId: true, weekday: true, startMin: true, endMin: true },
      }),
      db.job.findMany({
        where: {
          assignedProviderId: { in: candidateIds },
          status: { in: ["BOOKED", "IN_PROGRESS", "DONE_BY_PROVIDER", "DISPUTED"] },
          scheduledAt: { not: null },
        },
        select: { id: true, assignedProviderId: true, scheduledAt: true, durationMin: true },
      }),
    ]);
    const slotsBy = new Map<string, typeof slots>();
    for (const sl of slots) {
      const list = slotsBy.get(sl.providerId) ?? [];
      list.push(sl);
      slotsBy.set(sl.providerId, list);
    }
    const bookedBy = new Map<string, typeof committed>();
    for (const j of committed) {
      const list = bookedBy.get(j.assignedProviderId!) ?? [];
      list.push(j);
      bookedBy.set(j.assignedProviderId!, list);
    }
    visible = providers
      .filter((u) => isWithinAvailability(slotsBy.get(u.id) ?? [], at, DEFAULT_DURATION_MIN))
      .filter((u) => clashingBookings(bookedBy.get(u.id) ?? [], at, DEFAULT_DURATION_MIN).length === 0)
      .slice(0, PAGE_SIZE);
  }

  const ids = visible.map((u) => u.id);
  const ratings = await db.review.groupBy({
    by: ["rateeId"],
    where: { rateeId: { in: ids } },
    _avg: { rating: true },
    _count: { rating: true },
  });
  const ratingMap = new Map(ratings.map((r) => [r.rateeId, r]));

  return ok({
    // With a time filter, total reflects what survived the filter — an
    // unfiltered count would promise providers the pager cannot reach.
    total: at ? visible.length : total,
    filteredAt: at ? at.toISOString() : undefined,
    page,
    pageSize: PAGE_SIZE,
    providers: visible.map((u) => ({
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
    })),
  });
});
