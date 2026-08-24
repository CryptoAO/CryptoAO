import { z } from "zod";
import { NextRequest } from "next/server";
import { api, ok, parseBody, requireAdmin, audit, clientIp } from "@/lib/api";
import { db } from "@/lib/db";
import { resolveSos } from "@/lib/sos";

/**
 * The SOS queue. Unlike every other admin list, this one exposes the raiser's
 * full phone number and last-known coordinates — an operator needs to be able
 * to call them and tell responders where to go. Every read is audit-logged.
 */
export const GET = api(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const alerts = await db.sosAlert.findMany({
    where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } },
    include: {
      user: { include: { trustedContacts: true } },
      job: { select: { id: true, title: true, addressNote: true, barangay: true, cityCode: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  if (alerts.length > 0) {
    await audit("admin.sos_queue_view", {
      actorId: admin.id,
      meta: { count: alerts.length },
      ip: clientIp(req),
    });
  }

  return ok({
    alerts: alerts.map((a) => ({
      id: a.id,
      status: a.status,
      createdAt: a.createdAt,
      note: a.note,
      mapUrl: a.lat != null && a.lng != null ? `https://maps.google.com/?q=${a.lat},${a.lng}` : null,
      alertedContacts: a.alertedContacts,
      raiser: {
        id: a.user.id,
        name: `${a.user.firstName} ${a.user.lastName}`,
        phone: a.user.phone,
      },
      contacts: a.user.trustedContacts.map((c) => ({
        name: c.name,
        phone: c.phone,
        relation: c.relation,
      })),
      job: a.job
        ? {
            id: a.job.id,
            title: a.job.title,
            where: [a.job.addressNote, a.job.barangay, a.job.cityCode].filter(Boolean).join(", "),
          }
        : null,
    })),
  });
});

const schema = z.object({
  alertId: z.string().min(1),
  status: z.enum(["ACKNOWLEDGED", "RESOLVED"]),
  resolution: z.string().trim().max(1000).optional(),
});

export const POST = api(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const body = await parseBody(req, schema);
  const alert = await resolveSos(body.alertId, admin.id, body.status, body.resolution);
  await audit(`admin.sos_${body.status.toLowerCase()}`, {
    actorId: admin.id,
    targetType: "SosAlert",
    targetId: body.alertId,
    ip: clientIp(req),
  });
  return ok({ alert: { id: alert.id, status: alert.status } });
});
