import { NextRequest } from "next/server";
import { api, ok, ApiError, parseBody, requireVerifiedUser, audit, clientIp } from "@/lib/api";
import { db } from "@/lib/db";
import { messageCreateSchema } from "@/lib/validation";
import { maskContacts, STRIKE_LIMIT } from "@/lib/safety";
import { rateLimit, LIMITS } from "@/lib/ratelimit";

// Chat is scoped to a job and only between its client and a provider who has
// an offer on it (or is booked). All contact info is masked server-side
// BEFORE storage — the raw text is never persisted anywhere.

async function assertChatAllowed(jobId: string, a: string, b: string) {
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job) throw new ApiError(404, "Job not found");
  const pair = new Set([a, b]);
  if (!pair.has(job.clientId)) throw new ApiError(403, "Chat must include the job owner");
  const other = a === job.clientId ? b : a;
  if (job.assignedProviderId === other) return job;
  const offer = await db.offer.findUnique({
    where: { jobId_providerId: { jobId, providerId: other } },
  });
  if (!offer || offer.status === "WITHDRAWN") {
    throw new ApiError(403, "Make an offer first to chat with the client");
  }
  return job;
}

export const GET = api(async (req: NextRequest) => {
  const user = await requireVerifiedUser();
  const jobId = req.nextUrl.searchParams.get("jobId") ?? "";
  const withUserId = req.nextUrl.searchParams.get("with") ?? "";
  if (!jobId || !withUserId) throw new ApiError(400, "jobId and with are required");

  await assertChatAllowed(jobId, user.id, withUserId);

  const messages = await db.message.findMany({
    where: {
      jobId,
      OR: [
        { senderId: user.id, recipientId: withUserId },
        { senderId: withUserId, recipientId: user.id },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  return ok({
    messages: messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      body: m.body,
      flagged: m.rawFlagged,
      createdAt: m.createdAt,
    })),
  });
});

export const POST = api(async (req: NextRequest) => {
  const user = await requireVerifiedUser();
  if (!rateLimit(`msg:${user.id}`, LIMITS.message.max, LIMITS.message.windowMs)) {
    throw new ApiError(429, "Slow down a little 🙂");
  }
  const body = await parseBody(req, messageCreateSchema);
  if (body.toUserId === user.id) throw new ApiError(400, "You can't message yourself");

  await assertChatAllowed(body.jobId, user.id, body.toUserId);

  const { masked, flagged } = maskContacts(body.body);

  const message = await db.message.create({
    data: {
      jobId: body.jobId,
      senderId: user.id,
      recipientId: body.toUserId,
      body: masked,
      rawFlagged: flagged,
    },
  });

  if (flagged) {
    const updated = await db.user.update({
      where: { id: user.id },
      data: { strikeCount: { increment: 1 } },
    });
    if (updated.strikeCount >= STRIKE_LIMIT && updated.status === "ACTIVE") {
      await db.user.update({ where: { id: user.id }, data: { status: "FLAGGED" } });
    }
    await audit("message.contact_masked", {
      actorId: user.id,
      targetType: "Message",
      targetId: message.id,
      meta: { strikes: updated.strikeCount },
      ip: clientIp(req),
    });
  }

  return ok(
    {
      message: { id: message.id, senderId: message.senderId, body: message.body, flagged, createdAt: message.createdAt },
      warning: flagged
        ? "Para sa proteksyon mo, huwag magbigay ng number o mag-usap sa labas ng app. Kapag nag-bayad sa labas, walang escrow protection at pwedeng ma-suspend ang account."
        : undefined,
    },
    201,
  );
});
