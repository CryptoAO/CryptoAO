import { api, ok, ApiError, parseBody, clientIp, audit } from "@/lib/api";
import { db } from "@/lib/db";
import { otpVerifySchema } from "@/lib/validation";
import { normalizePhPhone } from "@/lib/sms";
import { rateLimit, LIMITS } from "@/lib/ratelimit";
import { verifyOtp } from "@/lib/otp";
import { setSessionCookie } from "@/lib/session";
import { selfUser } from "@/lib/serialize";

export const POST = api(async (req) => {
  const ip = clientIp(req);
  const body = await parseBody(req, otpVerifySchema);
  const phone = normalizePhPhone(body.phone);
  if (!phone) throw new ApiError(400, "Invalid phone number");
  if (!rateLimit(`otpv:${phone}:${ip}`, LIMITS.otpVerify.max, LIMITS.otpVerify.windowMs)) {
    throw new ApiError(429, "Too many attempts — request a new code");
  }

  await verifyOtp(phone, "REGISTER", body.code);

  const user = await db.user.findUnique({ where: { phone } });
  if (!user) throw new ApiError(404, "Account not found");
  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      phoneVerifiedAt: user.phoneVerifiedAt ?? new Date(),
      kycLevel: Math.max(user.kycLevel, 1),
    },
  });

  await setSessionCookie(updated.id, updated.tokenVersion);
  await audit("user.verify_phone", { actorId: updated.id, ip });
  return ok({ user: selfUser(updated) });
});
