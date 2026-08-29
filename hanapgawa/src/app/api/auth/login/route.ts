import bcrypt from "bcryptjs";
import { api, ok, ApiError, parseBody, clientIp, audit } from "@/lib/api";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import { normalizePhPhone } from "@/lib/sms";
import { rateLimit, rateLimitAsync, LIMITS } from "@/lib/ratelimit";
import { setSessionCookie } from "@/lib/session";
import { selfUser } from "@/lib/serialize";
import { verifyTotp } from "@/lib/totp";

// Dummy hash so wrong-phone and wrong-password take the same time.
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO7ZBpDLhBk1uQZ8y1lQ9XKQO9uW5oyBS";

export const POST = api(async (req) => {
  const ip = clientIp(req);
  if (!(await rateLimitAsync(`login:${ip}`, LIMITS.login.max, LIMITS.login.windowMs))) {
    throw new ApiError(429, "Too many login attempts — wait a few minutes");
  }

  const body = await parseBody(req, loginSchema);
  const phone = normalizePhPhone(body.phone);
  const user = phone ? await db.user.findUnique({ where: { phone } }) : null;

  const valid = await bcrypt.compare(body.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) throw new ApiError(401, "Wrong number or password");
  if (user.status === "DELETED") throw new ApiError(401, "Wrong number or password");
  if (user.status === "BANNED" || user.status === "SUSPENDED") {
    throw new ApiError(403, "This account is suspended. Contact support.");
  }

  // Second factor for admins: the console is god mode over everyone's money
  // and PII, so a password alone is not enough once 2FA is enabled. Checked
  // only AFTER the password verifies — the error below confirms nothing to
  // someone who has not already presented valid credentials.
  if (user.isAdmin && user.totpEnabledAt && user.totpSecret) {
    if (!body.totpCode) {
      throw new ApiError(401, "Kailangan ang authenticator code");
    }
    if (!rateLimit(`logintotp:${user.id}`, 10, 5 * 60_000)) {
      throw new ApiError(429, "Too many code attempts — wait a few minutes");
    }
    if (!verifyTotp(user.totpSecret, body.totpCode)) {
      throw new ApiError(401, "Mali ang authenticator code");
    }
  }

  await setSessionCookie(user.id, user.tokenVersion);
  await audit("user.login", { actorId: user.id, ip });
  return ok({ user: selfUser(user) });
});
