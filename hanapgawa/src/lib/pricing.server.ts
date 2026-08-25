// Server half of price guidance: the part that reads completed jobs.
// Kept out of src/lib/pricing.ts so the posting form can import the
// thresholds without pulling Prisma into the browser bundle.

import { db } from "./db";
import { MIN_SAMPLE, PriceGuidance, percentile, roundPeso } from "./pricing";

async function paidPrices(categoryId: string, cityCode?: string): Promise<number[]> {
  const rows = await db.job.findMany({
    where: {
      categoryId,
      status: "COMPLETED",
      agreedPriceCents: { not: null },
      ...(cityCode ? { cityCode } : {}),
    },
    select: { agreedPriceCents: true },
    orderBy: { completedAt: "desc" },
    // Recent jobs only: a rate from two years ago is not guidance, it is
    // history, and prices here move with fuel and rice.
    take: 200,
  });
  return rows
    .map((r) => r.agreedPriceCents!)
    .filter((c) => c > 0)
    .sort((a, b) => a - b);
}

export async function priceGuidance(categoryId: string, cityCode?: string): Promise<PriceGuidance | null> {
  const category = await db.category.findUnique({ where: { id: categoryId } });
  if (!category) return null;

  const base = {
    note: category.priceNote,
    minCents: category.minPriceCents,
  };

  if (cityCode) {
    const local = await paidPrices(categoryId, cityCode);
    if (local.length >= MIN_SAMPLE) {
      return {
        ...base,
        lowCents: roundPeso(percentile(local, 25)),
        highCents: roundPeso(percentile(local, 75)),
        source: "city",
        sampleSize: local.length,
      };
    }
  }

  const national = await paidPrices(categoryId);
  if (national.length >= MIN_SAMPLE) {
    return {
      ...base,
      lowCents: roundPeso(percentile(national, 25)),
      highCents: roundPeso(percentile(national, 75)),
      source: "nationwide",
      sampleSize: national.length,
    };
  }

  if (category.typicalLowCents == null || category.typicalHighCents == null) return null;
  return {
    ...base,
    lowCents: category.typicalLowCents,
    highCents: category.typicalHighCents,
    source: "estimate",
    sampleSize: 0,
  };
}
