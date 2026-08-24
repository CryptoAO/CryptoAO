import { z } from "zod";
import { api, ok, ApiError, parseBody, requireAdmin, audit, clientIp } from "@/lib/api";
import { db, moneyTxOptions } from "@/lib/db";

export const GET = api(async () => {
  await requireAdmin();
  const payouts = await db.payoutRequest.findMany({
    where: { status: "PENDING" },
    include: { user: true },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  return ok({
    payouts: payouts.map((p) => ({
      id: p.id,
      amountCents: p.amountCents,
      channel: p.channel,
      accountRef: p.accountRef,
      createdAt: p.createdAt,
      userName: `${p.user.firstName} ${p.user.lastName}`,
      userPhone: p.user.phone,
    })),
  });
});

const schema = z.object({
  payoutId: z.string(),
  decision: z.enum(["PAID", "REJECTED"]),
});

export const POST = api(async (req) => {
  const admin = await requireAdmin();
  const body = await parseBody(req, schema);

  const payout = await db.payoutRequest.findUnique({ where: { id: body.payoutId } });
  if (!payout || payout.status !== "PENDING") throw new ApiError(404, "Payout not found or already processed");

  await db.$transaction(async (tx) => {
    // Atomic claim: only one decision can ever apply to this payout, so a
    // double-click (or PAID + REJECTED race) can't re-credit twice.
    const claim = await tx.payoutRequest.updateMany({
      where: { id: payout.id, status: "PENDING" },
      data: { status: body.decision, processedAt: new Date() },
    });
    if (claim.count === 0) throw new ApiError(409, "Payout already processed");
    if (body.decision === "REJECTED") {
      // Re-credit the wallet (the request debited it up-front).
      await tx.ledgerEntry.create({
        data: { userId: payout.userId, type: "ADJUSTMENT", amountCents: payout.amountCents, note: "Cash-out rejected — refunded" },
      });
    }
  }, moneyTxOptions);

  await audit("admin.payout_decision", {
    actorId: admin.id,
    targetType: "PayoutRequest",
    targetId: payout.id,
    meta: { decision: body.decision },
    ip: clientIp(req),
  });
  return ok({ done: true });
});
