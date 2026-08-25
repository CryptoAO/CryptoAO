import { api, ok, ApiError } from "@/lib/api";
import { priceGuidance } from "@/lib/pricing.server";

/**
 * Price guidance for the job-posting form. Public on purpose: knowing the
 * going rate for ironing is not sensitive, and a provider deciding what to
 * charge benefits from exactly the same number the client sees.
 */
export const GET = api(async (req) => {
  const url = new URL(req.url);
  const categoryId = url.searchParams.get("categoryId");
  const cityCode = url.searchParams.get("cityCode") ?? undefined;
  if (!categoryId) throw new ApiError(400, "categoryId is required");

  const guidance = await priceGuidance(categoryId, cityCode);
  return ok({ guidance });
});
