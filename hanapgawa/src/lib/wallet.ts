import { Prisma } from "@prisma/client";
import { db } from "./db";
import { splitCommission } from "./money";

// Escrow model: money enters a user's wallet via TOPUP (GCash/Maya/card
// through the payment provider). Booking a job HOLDs the agreed price out of
// the client's balance. Confirming completion RELEASEs it: provider payout +
// platform commission. Cancelling refunds the hold. Every movement is a
// ledger row — balances are always derivable, never stored mutable state.
//
// NOTE (PH regulatory): the platform never holds client money as deposits —
// production flow keeps funds with the licensed payment aggregator
// (PayMongo/Xendit) under a collecting-agent agreement. See docs/LEGAL.md.

type Tx = Prisma.TransactionClient;

export async function walletBalanceCents(userId: string, tx: Tx | typeof db = db): Promise<number> {
  const agg = await tx.ledgerEntry.aggregate({
    where: { userId },
    _sum: { amountCents: true },
  });
  return agg._sum.amountCents ?? 0;
}

export async function platformEarningsCents(tx: Tx | typeof db = db): Promise<number> {
  const agg = await tx.ledgerEntry.aggregate({
    where: { userId: null, type: "COMMISSION" },
    _sum: { amountCents: true },
  });
  return agg._sum.amountCents ?? 0;
}

/** Dev-mode instant top-up. Production: created only by payment webhook. */
export async function creditTopup(userId: string, amountCents: number, note: string) {
  return db.ledgerEntry.create({
    data: { userId, type: "TOPUP", amountCents, note },
  });
}

/** Hold the agreed price from the client's balance. Throws if insufficient. */
export async function escrowHold(tx: Tx, jobId: string, clientId: string, amountCents: number) {
  const balance = await walletBalanceCents(clientId, tx);
  if (balance < amountCents) {
    throw new Error("INSUFFICIENT_BALANCE");
  }
  await tx.ledgerEntry.create({
    data: { userId: clientId, jobId, type: "ESCROW_HOLD", amountCents: -amountCents, note: "Held for job booking" },
  });
}

/** Release escrow: pay provider minus commission; commission goes to platform. */
export async function escrowRelease(
  tx: Tx,
  jobId: string,
  providerId: string,
  amountCents: number,
  takeRateBps: number,
) {
  const { commissionCents, payoutCents } = splitCommission(amountCents, takeRateBps);
  await tx.ledgerEntry.create({
    data: { userId: providerId, jobId, type: "ESCROW_RELEASE_PAYOUT", amountCents: payoutCents, note: "Job payout" },
  });
  await tx.ledgerEntry.create({
    data: { userId: null, jobId, type: "COMMISSION", amountCents: commissionCents, note: `Platform fee ${takeRateBps / 100}%` },
  });
  return { commissionCents, payoutCents };
}

/** Refund a held amount back to the client (cancellation before completion). */
export async function escrowRefund(tx: Tx, jobId: string, clientId: string, amountCents: number) {
  await tx.ledgerEntry.create({
    data: { userId: clientId, jobId, type: "ESCROW_REFUND", amountCents, note: "Booking refunded" },
  });
}
