import { z } from "zod";
import { api, ok, ApiError, parseBody, requireUser, audit, clientIp } from "@/lib/api";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/ratelimit";
import { PERIOD_MONTHS, createStatement } from "@/lib/earnings";

const createSchema = z.object({ months: z.union([z.literal(3), z.literal(6), z.literal(12)]) });

function view(s: {
  id: string; code: string; periodFrom: Date; periodTo: Date; totalPayoutCents: number;
  jobsCount: number; createdAt: Date; expiresAt: Date; revokedAt: Date | null;
}) {
  const active = !s.revokedAt && s.expiresAt > new Date();
  return {
    id: s.id,
    code: s.code,
    periodFrom: s.periodFrom,
    periodTo: s.periodTo,
    totalPayoutCents: s.totalPayoutCents,
    jobsCount: s.jobsCount,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    active,
    url: active ? `/verify/${s.code}` : null,
  };
}

/** The caller's own statements. */
export const GET = api(async () => {
  const user = await requireUser();
  const statements = await db.earningsStatement.findMany({
    where: { providerId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return ok({ statements: statements.map(view), periods: PERIOD_MONTHS });
});

/** Generate a new statement over the last N months of real payouts. */
export const POST = api(async (req) => {
  const user = await requireUser();
  if (!user.isProvider) throw new ApiError(403, "Para sa providers ang Patunay ng Kita");
  if (!rateLimit(`earnstmt:${user.id}`, 5, 60 * 60_000)) {
    throw new ApiError(429, "Kaka-generate mo lang — subukan mamaya");
  }
  const body = await parseBody(req, createSchema);
  const statement = await createStatement(user.id, body.months);
  await audit("earnings.statement_create", {
    actorId: user.id,
    targetType: "EarningsStatement",
    targetId: statement.id,
    meta: { months: body.months, totalPayoutCents: statement.totalPayoutCents },
    ip: clientIp(req),
  });
  return ok({ statement: view(statement) }, 201);
});

const revokeSchema = z.object({ id: z.string().min(1) });

/** Revoke one of your own statements — the code stops verifying immediately. */
export const DELETE = api(async (req) => {
  const user = await requireUser();
  const body = await parseBody(req, revokeSchema);
  const flip = await db.earningsStatement.updateMany({
    where: { id: body.id, providerId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (flip.count === 0) throw new ApiError(404, "Statement not found");
  await audit("earnings.statement_revoke", {
    actorId: user.id,
    targetType: "EarningsStatement",
    targetId: body.id,
    ip: clientIp(req),
  });
  return ok({ revoked: true });
});
