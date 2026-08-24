import { api, ok, ApiError, parseBody, requireProvider, audit, clientIp } from "@/lib/api";
import { db } from "@/lib/db";
import { offerCreateSchema } from "@/lib/validation";
import { parsePhpToCents, HIGH_VALUE_CENTS } from "@/lib/money";
import { rateLimit, LIMITS } from "@/lib/ratelimit";
import { offerView } from "@/lib/serialize";
import { notifyOfferReceived } from "@/lib/notify";

export const POST = api(async (req) => {
  const provider = await requireProvider();
  if (!rateLimit(`offer:${provider.id}`, LIMITS.jobPost.max, LIMITS.jobPost.windowMs)) {
    throw new ApiError(429, "You're sending offers too fast — slow down");
  }
  const body = await parseBody(req, offerCreateSchema);
  const priceCents = parsePhpToCents(body.pricePhp);

  const job = await db.job.findUnique({ where: { id: body.jobId }, include: { category: true } });
  if (!job || job.status !== "OPEN") throw new ApiError(404, "This job is not open anymore");
  if (job.clientId === provider.id) throw new ApiError(400, "You can't offer on your own job");
  if (priceCents < job.category.minPriceCents) {
    throw new ApiError(400, `Minimum price for this category is ₱${job.category.minPriceCents / 100}`);
  }
  if ((priceCents >= HIGH_VALUE_CENTS || job.budgetCents >= HIGH_VALUE_CENTS) && provider.kycLevel < 2) {
    throw new ApiError(403, "Jobs of ₱2,000+ need an ID-verified account. Verify your ID in your profile — it takes 2 minutes.");
  }

  const existing = await db.offer.findUnique({
    where: { jobId_providerId: { jobId: job.id, providerId: provider.id } },
  });
  if (existing && existing.status !== "WITHDRAWN") {
    throw new ApiError(409, "You already made an offer on this job");
  }

  const offer = existing
    ? await db.offer.update({
        where: { id: existing.id },
        data: { priceCents, message: body.message, status: "PENDING" },
      })
    : await db.offer.create({
        data: { jobId: job.id, providerId: provider.id, priceCents, message: body.message },
      });

  await notifyOfferReceived(job.clientId, job.id, job.title, provider.firstName, priceCents);
  await audit("offer.create", { actorId: provider.id, targetType: "Offer", targetId: offer.id, ip: clientIp(req) });
  return ok({ offer: offerView(offer) }, 201);
});
