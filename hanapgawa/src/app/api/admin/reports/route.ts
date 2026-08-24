import { z } from "zod";
import { api, ok, ApiError, parseBody, requireAdmin, audit, clientIp } from "@/lib/api";
import { db } from "@/lib/db";

export const GET = api(async () => {
  await requireAdmin();
  const [reports, flagged] = await Promise.all([
    db.report.findMany({
      where: { status: "OPEN" },
      include: { reporter: true, target: true },
      orderBy: { createdAt: "asc" },
      take: 100,
    }),
    db.user.findMany({ where: { status: "FLAGGED" }, take: 50 }),
  ]);
  return ok({
    reports: reports.map((r) => ({
      id: r.id,
      reason: r.reason,
      details: r.details,
      jobId: r.jobId,
      createdAt: r.createdAt,
      reporterName: `${r.reporter.firstName} ${r.reporter.lastName}`,
      targetId: r.targetId,
      targetName: `${r.target.firstName} ${r.target.lastName}`,
      targetStrikes: r.target.strikeCount,
    })),
    flaggedUsers: flagged.map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      strikes: u.strikeCount,
      kycLevel: u.kycLevel,
    })),
  });
});

const schema = z.object({
  action: z.enum(["resolve_report", "dismiss_report", "suspend_user", "reinstate_user"]),
  reportId: z.string().optional(),
  userId: z.string().optional(),
});

export const POST = api(async (req) => {
  const admin = await requireAdmin();
  const body = await parseBody(req, schema);

  if (body.action === "resolve_report" || body.action === "dismiss_report") {
    if (!body.reportId) throw new ApiError(400, "reportId required");
    const report = await db.report.findUnique({ where: { id: body.reportId } });
    if (!report || report.status !== "OPEN") throw new ApiError(404, "Report not found or already handled");
    await db.report.update({
      where: { id: report.id },
      data: { status: body.action === "resolve_report" ? "RESOLVED" : "DISMISSED" },
    });
  } else {
    if (!body.userId) throw new ApiError(400, "userId required");
    const target = await db.user.findUnique({ where: { id: body.userId } });
    if (!target) throw new ApiError(404, "User not found");
    if (target.isAdmin) throw new ApiError(400, "Cannot suspend an admin");
    await db.user.update({
      where: { id: target.id },
      data:
        body.action === "suspend_user"
          ? { status: "SUSPENDED", tokenVersion: { increment: 1 } } // kills their sessions
          : { status: "ACTIVE", strikeCount: 0 },
    });
  }

  await audit(`admin.${body.action}`, {
    actorId: admin.id,
    targetId: body.reportId ?? body.userId,
    ip: clientIp(req),
  });
  return ok({ done: true });
});
