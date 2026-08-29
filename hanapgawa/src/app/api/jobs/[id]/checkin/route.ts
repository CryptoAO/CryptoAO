import { z } from "zod";
import { api, ok, ApiError, parseBody, requireVerifiedUser, audit, clientIp } from "@/lib/api";
import { db } from "@/lib/db";
import { recordCheckIn } from "@/lib/sos";

const schema = z.object({
  kind: z.enum(["ARRIVED", "LEFT"]),
  lat: z.number().min(4).max(21).optional(),
  lng: z.number().min(116).max(127).optional(),
  note: z.string().trim().max(300).optional(),
});

/** The check-in trail for a job. Visible only to its two parties and admins. */
export const GET = api(async (_req, { params }) => {
  const { id } = await params;
  const user = await requireVerifiedUser();
  const job = await db.job.findUnique({ where: { id } });
  if (!job) throw new ApiError(404, "Job not found");
  if (job.clientId !== user.id && job.assignedProviderId !== user.id && !user.isAdmin) {
    throw new ApiError(403, "Not your job");
  }

  const entries = await db.jobCheckIn.findMany({
    where: { jobId: id },
    include: { user: { select: { firstName: true } } },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  return ok({
    checkIns: entries.map((c) => ({
      id: c.id,
      kind: c.kind,
      userId: c.userId,
      firstName: c.user.firstName,
      hasLocation: c.lat != null && c.lng != null,
      note: c.note,
      createdAt: c.createdAt,
    })),
  });
});

export const POST = api(async (req, { params }) => {
  const { id } = await params;
  const user = await requireVerifiedUser();
  const body = await parseBody(req, schema);

  const entry = await recordCheckIn(id, user.id, body.kind, { lat: body.lat, lng: body.lng }, body.note);
  await audit(`job.checkin.${body.kind.toLowerCase()}`, {
    actorId: user.id,
    targetType: "Job",
    targetId: id,
    ip: clientIp(req),
  });
  return ok({ checkIn: { id: entry.id, kind: entry.kind, createdAt: entry.createdAt } }, 201);
});
