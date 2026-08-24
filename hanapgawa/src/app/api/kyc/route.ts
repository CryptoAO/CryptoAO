import { api, ok, ApiError, parseBody, requireVerifiedUser, audit, clientIp } from "@/lib/api";
import { db } from "@/lib/db";
import { kycSubmitSchema } from "@/lib/validation";

export const GET = api(async () => {
  const user = await requireVerifiedUser();
  const submissions = await db.kycSubmission.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return ok({ kycLevel: user.kycLevel, submissions });
});

// Submit for L2 (gov ID) or L3 (NBI/police clearance). MVP records the
// declaration + last-4 and queues for manual admin review; production adds
// document upload to object storage and PSA eVerify / vendor eKYC.
export const POST = api(async (req) => {
  const user = await requireVerifiedUser();
  const body = await parseBody(req, kycSubmitSchema);

  if (body.level === 2 && user.kycLevel < 1) throw new ApiError(403, "Verify your phone first");
  if (body.level === 3 && user.kycLevel < 2) throw new ApiError(403, "Verify your ID first (Level 2)");
  if (user.kycLevel >= body.level) throw new ApiError(409, "You already have this verification level");

  const idDoc = ["PHILSYS", "DRIVERS_LICENSE", "UMID", "PASSPORT"].includes(body.docType);
  if (body.level === 2 && !idDoc) throw new ApiError(400, "Level 2 needs a government ID");
  if (body.level === 3 && idDoc) throw new ApiError(400, "Level 3 needs an NBI or police clearance");

  const pending = await db.kycSubmission.findFirst({
    where: { userId: user.id, level: body.level, status: "PENDING" },
  });
  if (pending) throw new ApiError(409, "Your verification is already being reviewed");

  const submission = await db.kycSubmission.create({
    data: { userId: user.id, level: body.level, docType: body.docType, idLastFour: body.idLastFour },
  });
  await audit("kyc.submit", { actorId: user.id, targetType: "KycSubmission", targetId: submission.id, ip: clientIp(req) });
  return ok({ submission }, 201);
});
