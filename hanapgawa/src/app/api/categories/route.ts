import { api, ok } from "@/lib/api";
import { db } from "@/lib/db";

export const GET = api(async () => {
  const categories = await db.category.findMany({
    where: { active: true },
    orderBy: { sort: "asc" },
    select: { id: true, slug: true, name: true, nameTl: true, icon: true, minPriceCents: true, defaultTakeRateBps: true },
  });
  return ok({ categories });
});
