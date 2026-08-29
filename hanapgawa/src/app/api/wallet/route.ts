import { api, ok, requireUser } from "@/lib/api";
import { db } from "@/lib/db";
import { walletBalanceCents } from "@/lib/wallet";

export const GET = api(async () => {
  const user = await requireUser();
  const [balance, entries, payouts] = await Promise.all([
    walletBalanceCents(user.id),
    db.ledgerEntry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.payoutRequest.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  return ok({ balanceCents: balance, entries, payouts });
});
