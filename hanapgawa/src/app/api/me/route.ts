import { api, ok, parseBody, requireUser } from "@/lib/api";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { selfUser } from "@/lib/serialize";
import { walletBalanceCents } from "@/lib/wallet";

export const GET = api(async () => {
  const user = await getSessionUser();
  if (!user) return ok({ user: null });
  const balance = await walletBalanceCents(user.id);
  return ok({ user: { ...selfUser(user), notifyNewJobs: user.notifyNewJobs }, balanceCents: balance });
});

const prefsSchema = z.object({ notifyNewJobs: z.boolean() });

/** Update the caller's own notification preferences. */
export const POST = api(async (req) => {
  const user = await requireUser();
  const body = await parseBody(req, prefsSchema);
  await db.user.update({ where: { id: user.id }, data: { notifyNewJobs: body.notifyNewJobs } });
  return ok({ notifyNewJobs: body.notifyNewJobs });
});
