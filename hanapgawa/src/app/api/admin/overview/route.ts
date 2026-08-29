import { api, ok, requireAdmin } from "@/lib/api";
import { db } from "@/lib/db";
import { platformEarningsCents } from "@/lib/wallet";

export const GET = api(async () => {
  await requireAdmin();
  const [users, providers, jobs, completed, openDisputes, pendingKyc, pendingPayouts, openReports, flaggedUsers, openSos, earnings] =
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
      db.sosAlert.count({ where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } } }),
      platformEarningsCents(),
    ]);
  // GMV = value of completed jobs only. Summing raw ESCROW_HOLDs would count
  // bookings that were later refunded/cancelled and overstate the number.
  const gmv = await db.job.aggregate({
    where: { status: "COMPLETED" },
    _sum: { agreedPriceCents: true },
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
    openSos,
    earningsCents: earnings,
    gmvCents: gmv._sum.agreedPriceCents ?? 0,
  });
});
