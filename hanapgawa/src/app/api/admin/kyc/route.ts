import { z } from "zod";
import { api, ok, ApiError, parseBody, requireAdmin, audit, clientIp } from "@/lib/api";
import { db } from "@/lib/db";
import { publicUser } from "@/lib/serialize";
import { notifyKycDecision } from "@/lib/notify";
import { objectStore } from "@/lib/storage";

export const GET = api(async () => {
  await requireAdmin();
  const queue = await db.kycSubmission.findMany({
    where: { status: "PENDING" },
    include: { user: true },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  return ok({
    queue: queue.map((k) => ({
      id: k.id,
      level: k.level,
      docType: k.docType,
      idLastFour: k.idLastFour,
      hasDocument: k.docRef != null && k.docPurgedAt == null,
      createdAt: k.createdAt,
      user: { ...publicUser(k.user), lastName: k.user.lastName, phone: k.user.phone },
    })),
  });
});

const decisionSchema = z.object({
  submissionId: z.string(),
  decision: z.enum(["APPROVED", "REJECTED"]),
  notes: z.string().max(1000).optional(),
});

export const POST = api(async (req) => {
  const admin = await requireAdmin();
  const body = await parseBody(req, decisionSchema);

  const submission = await db.kycSubmission.findUnique({ where: { id: body.submissionId } });
  if (!submission || submission.status !== "PENDING") throw new ApiError(404, "Submission not found or already handled");

  await db.$transaction(async (tx) => {
    // Atomic claim: two admins deciding at once can't both apply.
    const claim = await tx.kycSubmission.updateMany({
      where: { id: submission.id, status: "PENDING" },
      data: { status: body.decision, reviewerId: admin.id, notes: body.notes, reviewedAt: new Date() },
    });
    if (claim.count === 0) throw new ApiError(409, "Submission already handled");
    if (body.decision === "APPROVED") {
      const stamp = submission.level === 2 ? { idVerifiedAt: new Date() } : { clearanceVerifiedAt: new Date() };
      await tx.user.update({
        where: { id: submission.userId },
        data: { kycLevel: submission.level, ...stamp },
      });
    }
  });

  // Data minimization (RA 10173): the image has served its purpose once a
  // human has decided. Keep the decision and the audit trail, drop the scan.
  if (submission.docRef) {
    await objectStore().remove(submission.docRef);
    await db.kycSubmission.update({
      where: { id: submission.id },
      data: { docPurgedAt: new Date() },
    });
  }

  await notifyKycDecision(submission.userId, body.decision === "APPROVED", submission.level);
  await audit("admin.kyc_decision", {
    actorId: admin.id,
    targetType: "KycSubmission",
    targetId: submission.id,
    meta: { decision: body.decision },
    ip: clientIp(req),
  });
  return ok({ done: true });
});
