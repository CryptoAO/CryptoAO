import { api, ok, requireAdmin } from "@/lib/api";
import { db } from "@/lib/db";
import { platformEarningsCents } from "@/lib/wallet";

export const GET = api(async () => {
  await requireAdmin();
  const [users, providers, jobs, completed, openDisputes, pendingKyc, pendingPayouts, openReports, flaggedUsers, earnings] =
    await Promise.all([
      db.user.count(),
      db.user.count({ where: { isProvider: true } }),
      db.job.count(),
      db.job.count({ where: { status: "COMPLETED" } }),
      db.dispute.count({ where: { status: "OPEN" } }),
      db.kycSubmission.count({ where: { status: "PENDING" } }),
      db.payoutRequest.count({ where: { status: "PENDING" } }),
      db.report.count({ where: { status: "OPEN" } }),
      db.user.count({ where: { status: "FLAGGED" } }),
      platformEarningsCents(),
    ]);
  const gmv = await db.ledgerEntry.aggregate({
    where: { type: "ESCROW_HOLD" },
    _sum: { amountCents: true },
  });
  return ok({
    users,
    providers,
    jobs,
    completed,
    openDisputes,
    pendingKyc,
    pendingPayouts,
    openReports,
    flaggedUsers,
    earningsCents: earnings,
    gmvCents: -(gmv._sum.amountCents ?? 0),
  });
});
