import bcrypt from "bcryptjs";
import { z } from "zod";
import { api, ok, ApiError, parseBody, requireUser, audit, clientIp } from "@/lib/api";
import { checkClosure, closeAccount } from "@/lib/account";
import { clearSessionCookie } from "@/lib/session";

const schema = z.object({ password: z.string().min(1).max(72) });

/** What is standing between this account and closure, if anything. */
export const GET = api(async () => {
  const user = await requireUser();
  return ok(await checkClosure(user.id));
});

/**
 * Close the account. Password is required even though the caller already
 * holds a session: this is irreversible, and a borrowed unlocked phone
 * should not be enough to erase somebody's work history.
 */
export const POST = api(async (req) => {
  const user = await requireUser();
  const body = await parseBody(req, schema);

  if (!(await bcrypt.compare(body.password, user.passwordHash))) {
    throw new ApiError(401, "Mali ang password.");
  }

  // Re-checked here, not just in the GET: the dialog may have been open for
  // a while, and a booking accepted in the meantime must still block.
  const check = await checkClosure(user.id);
  if (!check.canClose) throw new ApiError(409, check.blockers.map((b) => b.message).join(" "));

  const result = await closeAccount(user.id);
  // Audit before the cookie goes, while we still know who acted.
  await audit("account.close", { actorId: user.id, ip: clientIp(req) });
  await clearSessionCookie();
  return ok(result);
});
