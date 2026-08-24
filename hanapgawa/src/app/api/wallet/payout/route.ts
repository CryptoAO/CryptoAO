import { api, ok, ApiError, parseBody, requireProvider, audit, clientIp } from "@/lib/api";
import { db, moneyTxOptions } from "@/lib/db";
import { payoutRequestSchema } from "@/lib/validation";
import { parsePhpToCents } from "@/lib/money";
import { walletBalanceCents } from "@/lib/wallet";

// Cash-out: creates a PENDING payout request and immediately debits the
// wallet (so the same peso can't be cashed out twice). Admin marks it PAID
// after the GCash/Maya transfer, or REJECTED (which re-credits).
export const POST = api(async (req) => {
  const user = await requireProvider();
  const body = await parseBody(req, payoutRequestSchema);
  const amountCents = parsePhpToCents(body.amountPhp);

  // Store the payout destination masked — full numbers live with the payment
  // processor, not in our DB.
  const ref = body.accountRef.replace(/\s/g, "");
  const maskedRef = `${body.channel}:••••${ref.slice(-4)}`;

  const result = await db.$transaction(async (tx) => {
    const balance = await walletBalanceCents(user.id, tx);
    if (balance < amountCents) throw new ApiError(402, "Not enough balance to cash out");
    const payout = await tx.payoutRequest.create({
      data: { userId: user.id, amountCents, channel: body.channel, accountRef: maskedRef },
    });
    await tx.ledgerEntry.create({
      data: { userId: user.id, type: "PAYOUT_CASHOUT", amountCents: -amountCents, note: `Cash-out ${maskedRef}` },
    });
    // Belt-and-braces: if a concurrent debit slipped between the balance
    // check and our insert (possible outside Serializable), roll back.
    const after = await walletBalanceCents(user.id, tx);
    if (after < 0) throw new ApiError(409, "Balance changed — try again");
    return payout;
  }, moneyTxOptions);

  await audit("wallet.payout_request", { actorId: user.id, targetType: "PayoutRequest", targetId: result.id, ip: clientIp(req) });
  return ok({ payout: result }, 201);
});
