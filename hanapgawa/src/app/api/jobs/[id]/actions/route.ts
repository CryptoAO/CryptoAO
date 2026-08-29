import { z } from "zod";
import { api, ok, ApiError, parseBody, requireVerifiedUser, audit, clientIp } from "@/lib/api";
import { startJob, markDone, confirmComplete, cancelJob, openDispute } from "@/lib/jobs";
import { confirmDirectJob, declineDirectJob } from "@/lib/direct";

const actionSchema = z.object({
  action: z.enum(["start", "done", "complete", "cancel", "dispute", "confirm", "decline"]),
  reason: z.string().trim().max(1000).optional(),
});

// One endpoint for lifecycle actions; every transition re-checks ownership
// and state inside src/lib/jobs.ts (the single source of truth).
export const POST = api(async (req, { params }) => {
  const { id } = await params;
  const user = await requireVerifiedUser();
  const { action, reason } = await parseBody(req, actionSchema);

  let result: unknown;
  switch (action) {
    case "start":
      result = await startJob(id, user.id);
      break;
    case "done":
      result = await markDone(id, user.id);
      break;
    case "complete":
      result = await confirmComplete(id, user.id);
      break;
    case "cancel":
      result = await cancelJob(id, user.id, user.isAdmin);
      break;
    case "dispute":
      if (!reason) throw new ApiError(400, "Tell us what went wrong");
      result = await openDispute(id, user.id, reason);
      break;
    // Direct-request answers; both re-check that the caller IS the target.
    case "confirm":
      result = await confirmDirectJob(id, user.id);
      break;
    case "decline":
      result = await declineDirectJob(id, user.id);
      break;
  }

  await audit(`job.${action}`, { actorId: user.id, targetType: "Job", targetId: id, ip: clientIp(req) });
  return ok({ result });
});
