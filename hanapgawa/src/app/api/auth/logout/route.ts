import { api, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { clearSessionCookie, getSessionUser } from "@/lib/session";

// Logout revokes, not just forgets. Bumping tokenVersion invalidates every
// outstanding JWT for this account — deliberately "log out everywhere".
// For this audience that is the right semantics: someone pressing logout on
// a borrowed phone or an internet-café PC means "walang naiwan", not
// "forget this one cookie while the token stays live for 7 days".
export const POST = api(async () => {
  const user = await getSessionUser();
  if (user) {
    await db.user.update({
      where: { id: user.id },
      data: { tokenVersion: { increment: 1 } },
    });
  }
  await clearSessionCookie();
  return ok({ done: true });
});
