import bcrypt from "bcryptjs";
import { api, ok, ApiError, parseBody, clientIp, audit } from "@/lib/api";
import { db } from "@/lib/db";
import { registerSchema } from "@/lib/validation";
import { normalizePhPhone } from "@/lib/sms";
import { isValidCityInRegion } from "@/lib/psgc";
import { rateLimitAsync, LIMITS } from "@/lib/ratelimit";
import { devSmsEcho, issueOtp } from "@/lib/otp";
import { TERMS_VERSION } from "@/lib/legal";

export const POST = api(async (req) => {
  const ip = clientIp(req);
  if (!(await rateLimitAsync(`register:${ip}`, LIMITS.register.max, LIMITS.register.windowMs))) {
    throw new ApiError(429, "Too many sign-ups from this connection — try again later");
  }

  const body = await parseBody(req, registerSchema);
  const phone = normalizePhPhone(body.phone);
  if (!phone) throw new ApiError(400, "Enter a valid PH mobile number (09XXXXXXXXX)");
  if (!isValidCityInRegion(body.cityCode, body.regionCode)) {
    throw new ApiError(400, "Please pick your city and region");
  }

  // Hash before the existence check so both paths cost about the same time.
  const passwordHash = await bcrypt.hash(body.password, 12);

  const existing = await db.user.findUnique({ where: { phone } });
  if (existing) {
    // Anti-enumeration: identical response whether or not the number is
    // registered. A still-unverified account gets its OTP re-sent; a verified
    // owner simply receives no code (they log in instead), and an attacker
    // learns nothing from the response.
    if (
      existing.phoneVerifiedAt == null &&
      (await rateLimitAsync(`otp:${phone}`, LIMITS.otpSend.max, LIMITS.otpSend.windowMs))
    ) {
      const code = await issueOtp(phone, "REGISTER");
      if (devSmsEcho()) return ok({ next: "verify", phone, devCode: code }, 201);
    }
    return ok({ next: "verify", phone }, 201);
  }

  const user = await db.user.create({
    data: {
      phone,
      passwordHash,
      firstName: body.firstName,
      lastName: body.lastName,
      regionCode: body.regionCode,
      cityCode: body.cityCode,
      isProvider: body.wantsProvider,
      termsVersion: TERMS_VERSION,
      termsAcceptedAt: new Date(),
    },
  });

  if (!(await rateLimitAsync(`otp:${phone}`, LIMITS.otpSend.max, LIMITS.otpSend.windowMs))) {
    throw new ApiError(429, "Too many codes sent — wait a few minutes");
  }
  const code = await issueOtp(phone, "REGISTER");
  await audit("user.register", { actorId: user.id, ip });

  return ok({ next: "verify", phone, ...(devSmsEcho() ? { devCode: code } : {}) }, 201);
});
