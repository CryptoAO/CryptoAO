import { api, ok, ApiError, parseBody, requireVerifiedUser, audit, clientIp } from "@/lib/api";
import { db } from "@/lib/db";
import { reviewCreateSchema } from "@/lib/validation";

// Reviews only exist after real, paid work: job must be COMPLETED and the
// reviewer must be one of its two parties. This is what keeps ratings honest.
export const POST = api(async (req) => {
  const user = await requireVerifiedUser();
  const body = await parseBody(req, reviewCreateSchema);

  const job = await db.job.findUnique({ where: { id: body.jobId } });
  if (!job) throw new ApiError(404, "Job not found");
  if (job.status !== "COMPLETED") throw new ApiError(409, "You can review only finished jobs");

  let rateeId: string;
  if (user.id === job.clientId) rateeId = job.assignedProviderId!;
  else if (user.id === job.assignedProviderId) rateeId = job.clientId;
  else throw new ApiError(403, "Only the client and provider can review this job");

  const existing = await db.review.findUnique({
    where: { jobId_raterId: { jobId: job.id, raterId: user.id } },
  });
  if (existing) throw new ApiError(409, "You already reviewed this job");

  const review = await db.review.create({
    data: { jobId: job.id, raterId: user.id, rateeId, rating: body.rating, comment: body.comment },
  });
  await audit("review.create", { actorId: user.id, targetType: "Review", targetId: review.id, ip: clientIp(req) });
  return ok({ review }, 201);
});
