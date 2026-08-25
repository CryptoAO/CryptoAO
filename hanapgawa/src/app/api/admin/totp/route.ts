import { z } from "zod";
import { api, ok, ApiError, parseBody, requireAdmin, audit, clientIp } from "@/lib/api";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/ratelimit";
import { generateTotpSecret, otpauthUri, verifyTotp } from "@/lib/totp";

/** Whether the calling admin has 2FA on. */
export const GET = api(async () => {
  const admin = await requireAdmin();
  return ok({ enabled: admin.totpEnabledAt != null });
});

const schema = z.object({
  action: z.enum(["setup", "enable", "disable"]),
  code: z.string().trim().max(10).optional(),
});

/**
 * Setup → returns a fresh secret (shown once); enable → proves the
 * authenticator works before 2FA starts gating logins — enabling on an
 * untested secret would lock the admin out of their own console; disable →
 * requires a current code, so a walked-away-from session cannot quietly
 * strip the protection.
 */
export const POST = api(async (req) => {
  const admin = await requireAdmin();
  const body = await parseBody(req, schema);
  if (!rateLimit(`admintotp:${admin.id}`, 10, 5 * 60_000)) {
    throw new ApiError(429, "Too many attempts — wait a few minutes");
  }

  if (body.action === "setup") {
    if (admin.totpEnabledAt) throw new ApiError(409, "Naka-on na ang 2FA — i-disable muna para magpalit ng secret");
    const secret = generateTotpSecret();
    await db.user.update({ where: { id: admin.id }, data: { totpSecret: secret, totpEnabledAt: null } });
    // The secret crosses the wire exactly once, here, to the authenticated
    // admin who asked for it. It is never returned by any other endpoint.
    return ok({ secret, otpauth: otpauthUri(secret, admin.phone) });
  }

  if (body.action === "enable") {
    if (!admin.totpSecret) throw new ApiError(409, "Mag-setup muna");
    if (!body.code || !verifyTotp(admin.totpSecret, body.code)) {
      throw new ApiError(401, "Mali ang code — subukan ulit mula sa authenticator app");
    }
    await db.user.update({ where: { id: admin.id }, data: { totpEnabledAt: new Date() } });
    await audit("admin.totp_enable", { actorId: admin.id, ip: clientIp(req) });
    return ok({ enabled: true });
  }

  // disable
  if (!admin.totpEnabledAt || !admin.totpSecret) return ok({ enabled: false });
  if (!body.code || !verifyTotp(admin.totpSecret, body.code)) {
    throw new ApiError(401, "Kailangan ang kasalukuyang code para i-disable");
  }
  await db.user.update({ where: { id: admin.id }, data: { totpSecret: null, totpEnabledAt: null } });
  await audit("admin.totp_disable", { actorId: admin.id, ip: clientIp(req) });
  return ok({ enabled: false });
});
