import { NextRequest } from "next/server";
import { api, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { publicUser } from "@/lib/serialize";

const PAGE_SIZE = 20;

/** Browse providers by region/city/category with rating summary. */
export const GET = api(async (req: NextRequest) => {
  const p = req.nextUrl.searchParams;
  const regionCode = p.get("region") ?? undefined;
  const cityCode = p.get("city") ?? undefined;
  const categoryId = p.get("category") ?? undefined;
  const page = Math.max(1, Math.min(100, Number(p.get("page") ?? 1) || 1));

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
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
  ]);

  const ids = providers.map((u) => u.id);
  const ratings = await db.review.groupBy({
    by: ["rateeId"],
    where: { rateeId: { in: ids } },
    _avg: { rating: true },
    _count: { rating: true },
  });
  const ratingMap = new Map(ratings.map((r) => [r.rateeId, r]));

  return ok({
    total,
    page,
    pageSize: PAGE_SIZE,
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
    })),
  });
});
