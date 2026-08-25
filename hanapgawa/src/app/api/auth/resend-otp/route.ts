import { z } from "zod";
import { api, ok, ApiError, parseBody, clientIp } from "@/lib/api";
import { db } from "@/lib/db";
import { normalizePhPhone } from "@/lib/sms";
import { rateLimit, LIMITS } from "@/lib/ratelimit";
import { devSmsEcho, issueOtp } from "@/lib/otp";
import { phoneSchema } from "@/lib/validation";

export const POST = api(async (req) => {
  const body = await parseBody(req, z.object({ phone: phoneSchema }));
  const phone = normalizePhPhone(body.phone);
  if (!phone) throw new ApiError(400, "Invalid phone number");
  if (!rateLimit(`otp:${phone}`, LIMITS.otpSend.max, LIMITS.otpSend.windowMs)) {
    throw new ApiError(429, "Too many codes sent — wait a few minutes");
  }
  // Same response whether or not the account exists (no account enumeration).
  const user = await db.user.findUnique({ where: { phone } });
  if (user && !user.phoneVerifiedAt) {
    const code = await issueOtp(phone, "REGISTER");
    void clientIp(req);
    if (devSmsEcho()) return ok({ sent: true, devCode: code });
  }
  void clientIp(req);
  return ok({ sent: true });
});
