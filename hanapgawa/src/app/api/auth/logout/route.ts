import { api, ok } from "@/lib/api";
import { clearSessionCookie } from "@/lib/session";

export const POST = api(async () => {
  await clearSessionCookie();
  return ok({ done: true });
});
