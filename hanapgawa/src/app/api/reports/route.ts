import { api, ok, ApiError, parseBody, requireVerifiedUser, audit, clientIp } from "@/lib/api";
import { db } from "@/lib/db";
import { reportSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/ratelimit";

export const POST = api(async (req) => {
  const user = await requireVerifiedUser();
  if (!rateLimit(`report:${user.id}`, 10, 60 * 60_000)) {
    throw new ApiError(429, "Too many reports — our team is reviewing your earlier ones");
  }
  const body = await parseBody(req, reportSchema);
  if (body.targetId === user.id) throw new ApiError(400, "You can't report yourself");

  const target = await db.user.findUnique({ where: { id: body.targetId } });
  if (!target) throw new ApiError(404, "User not found");

  const report = await db.report.create({
    data: {
      reporterId: user.id,
      targetId: body.targetId,
      jobId: body.jobId,
      reason: body.reason,
      details: body.details,
    },
  });
  await audit("report.create", { actorId: user.id, targetType: "Report", targetId: report.id, ip: clientIp(req) });
  return ok({ report: { id: report.id, status: report.status } }, 201);
});
