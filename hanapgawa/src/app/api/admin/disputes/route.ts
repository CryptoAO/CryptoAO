import { z } from "zod";
import { api, ok, parseBody, requireAdmin, audit, clientIp } from "@/lib/api";
import { db } from "@/lib/db";
import { resolveDispute } from "@/lib/jobs";

export const GET = api(async () => {
  await requireAdmin();
  const disputes = await db.dispute.findMany({
    where: { status: "OPEN" },
    include: { job: { include: { client: true, provider: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  return ok({
    disputes: disputes.map((d) => ({
      id: d.id,
      reason: d.reason,
      createdAt: d.createdAt,
      openedById: d.openedById,
      job: {
        id: d.job.id,
        title: d.job.title,
        agreedPriceCents: d.job.agreedPriceCents,
        clientName: `${d.job.client.firstName} ${d.job.client.lastName}`,
        providerName: d.job.provider ? `${d.job.provider.firstName} ${d.job.provider.lastName}` : null,
      },
    })),
  });
});

const schema = z.object({
  disputeId: z.string(),
  resolution: z.enum(["REFUND_CLIENT", "PAY_PROVIDER", "SPLIT"]),
});

export const POST = api(async (req) => {
  const admin = await requireAdmin();
  const body = await parseBody(req, schema);
  const dispute = await resolveDispute(body.disputeId, admin.id, body.resolution);
  await audit("admin.dispute_resolve", {
    actorId: admin.id,
    targetType: "Dispute",
    targetId: body.disputeId,
    meta: { resolution: body.resolution },
    ip: clientIp(req),
  });
  return ok({ dispute });
});
