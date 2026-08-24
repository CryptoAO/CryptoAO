import { api, ok, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { publicUser } from "@/lib/serialize";

export const GET = api(async (_req, { params }) => {
  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    include: {
      providerCategories: { include: { category: true } },
      availability: true,
    },
  });
  if (!user || !user.isProvider || user.status === "BANNED") throw new ApiError(404, "Provider not found");

  const [ratings, reviews, completedCount] = await Promise.all([
    db.review.aggregate({ where: { rateeId: id }, _avg: { rating: true }, _count: { rating: true } }),
    db.review.findMany({
      where: { rateeId: id },
      include: { rater: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.job.count({ where: { assignedProviderId: id, status: "COMPLETED" } }),
  ]);

  return ok({
    provider: {
      ...publicUser(user),
      categories: user.providerCategories.map((pc) => ({
        categoryId: pc.categoryId,
        name: pc.category.name,
        nameTl: pc.category.nameTl,
        icon: pc.category.icon,
        headline: pc.headline,
        rateCents: pc.rateCents,
        rateUnit: pc.rateUnit,
        yearsExp: pc.yearsExp,
      })),
      availability: user.availability.map((a) => ({ weekday: a.weekday, startMin: a.startMin, endMin: a.endMin })),
      completedJobs: completedCount,
      ratingAvg: ratings._avg.rating,
      ratingCount: ratings._count.rating,
    },
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      rater: publicUser(r.rater),
    })),
  });
});
