import bcrypt from "bcryptjs";
import { z } from "zod";
import { api, ok, ApiError, parseBody, clientIp, audit } from "@/lib/api";
import { db } from "@/lib/db";
import { normalizePhPhone } from "@/lib/sms";
import { rateLimit, LIMITS } from "@/lib/ratelimit";
import { issueOtp, verifyOtp } from "@/lib/otp";
import { phoneSchema, passwordSchema, otpVerifySchema } from "@/lib/validation";
import { setSessionCookie } from "@/lib/session";
import { selfUser } from "@/lib/serialize";

// Password reset by SMS code. Two steps against one endpoint:
//   { step: "request", phone }                  -> sends a RESET code
//   { step: "confirm", phone, code, password }  -> sets the new password
//
// Neither step ever reveals whether an account exists (no enumeration), and
// a successful reset bumps tokenVersion so any session an attacker may hold
// is revoked at the same moment.

const schema = z.discriminatedUnion("step", [
  z.object({ step: z.literal("request"), phone: phoneSchema }),
  z.object({
    step: z.literal("confirm"),
    phone: otpVerifySchema.shape.phone,
    code: otpVerifySchema.shape.code,
    password: passwordSchema,
  }),
]);

export const POST = api(async (req) => {
  const ip = clientIp(req);
  const body = await parseBody(req, schema);
  const phone = normalizePhPhone(body.phone);
  if (!phone) throw new ApiError(400, "Enter a valid PH mobile number (09XXXXXXXXX)");

  if (body.step === "request") {
    if (!rateLimit(`reset:${phone}`, LIMITS.otpSend.max, LIMITS.otpSend.windowMs)) {
      throw new ApiError(429, "Too many codes sent — wait a few minutes");
    }
    const user = await db.user.findUnique({ where: { phone } });
    // Only verified accounts can reset by SMS; response is identical either way.
    if (user && user.phoneVerifiedAt) await issueOtp(phone, "RESET");
    return ok({ sent: true });
  }

  if (!rateLimit(`resetv:${phone}:${ip}`, LIMITS.otpVerify.max, LIMITS.otpVerify.windowMs)) {
    throw new ApiError(429, "Too many attempts — request a new code");
  }
  await verifyOtp(phone, "RESET", body.code);

  const user = await db.user.findUnique({ where: { phone } });
  if (!user) throw new ApiError(400, "Code expired — request a new one");
  if (user.status === "BANNED" || user.status === "SUSPENDED") {
    throw new ApiError(403, "This account is suspended. Contact support.");
  }

  const passwordHash = await bcrypt.hash(body.password, 12);
  const updated = await db.user.update({
    where: { id: user.id },
    // Bumping tokenVersion logs out every existing session, including any
    // an attacker holds — the whole point of a reset.
    data: { passwordHash, tokenVersion: { increment: 1 } },
  });

  await setSessionCookie(updated.id, updated.tokenVersion);
  await audit("user.password_reset", { actorId: updated.id, ip });
  return ok({ user: selfUser(updated) });
});
