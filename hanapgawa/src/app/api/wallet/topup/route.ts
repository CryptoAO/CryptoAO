import { api, ok, parseBody, requireVerifiedUser, audit, clientIp, ApiError } from "@/lib/api";
import { topupSchema } from "@/lib/validation";
import { parsePhpToCents } from "@/lib/money";
import { paymentProvider } from "@/lib/payments";
import { rateLimit, LIMITS } from "@/lib/ratelimit";

export const POST = api(async (req) => {
  const user = await requireVerifiedUser();
  if (!rateLimit(`topup:${user.id}`, 10, 60 * 60_000)) {
    throw new ApiError(429, "Too many top-ups — try again later");
  }
  const body = await parseBody(req, topupSchema);
  const amountCents = parsePhpToCents(body.amountPhp);

  const result = await paymentProvider().createTopup(user.id, amountCents);
  await audit("wallet.topup", { actorId: user.id, meta: { amountCents, kind: result.kind }, ip: clientIp(req) });
  return ok(result);
});
