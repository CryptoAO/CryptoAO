import bcrypt from "bcryptjs";
import { api, ok, ApiError, parseBody, clientIp, audit } from "@/lib/api";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import { normalizePhPhone } from "@/lib/sms";
import { rateLimitAsync, LIMITS } from "@/lib/ratelimit";
import { setSessionCookie } from "@/lib/session";
import { selfUser } from "@/lib/serialize";

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

  await setSessionCookie(user.id, user.tokenVersion);
  await audit("user.login", { actorId: user.id, ip });
  return ok({ user: selfUser(user) });
});
