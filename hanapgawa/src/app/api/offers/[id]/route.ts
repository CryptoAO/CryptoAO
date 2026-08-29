import { z } from "zod";
import { api, ok, ApiError, parseBody, requireVerifiedUser, audit, clientIp } from "@/lib/api";
import { db } from "@/lib/db";
import { acceptOffer } from "@/lib/jobs";

const schema = z.object({ action: z.enum(["accept", "withdraw", "decline"]) });

export const POST = api(async (req, { params }) => {
  const { id } = await params;
  const user = await requireVerifiedUser();
  const { action } = await parseBody(req, schema);

  const offer = await db.offer.findUnique({ where: { id }, include: { job: true } });
  if (!offer) throw new ApiError(404, "Offer not found");

  if (action === "accept") {
    // Ownership + state checks happen inside the transaction.
    const job = await acceptOffer(offer.jobId, offer.id, user.id);
    await audit("offer.accept", { actorId: user.id, targetType: "Offer", targetId: id, ip: clientIp(req) });
    return ok({ job });
  }

  if (action === "decline") {
    if (offer.job.clientId !== user.id) throw new ApiError(403, "Only the job owner can decline");
    if (offer.status !== "PENDING") throw new ApiError(409, "Offer is not pending");
    await db.offer.update({ where: { id }, data: { status: "DECLINED" } });
    return ok({ done: true });
  }

  // withdraw
  if (offer.providerId !== user.id) throw new ApiError(403, "Not your offer");
  if (offer.status !== "PENDING") throw new ApiError(409, "Only pending offers can be withdrawn");
  await db.offer.update({ where: { id }, data: { status: "WITHDRAWN" } });
  return ok({ done: true });
});
