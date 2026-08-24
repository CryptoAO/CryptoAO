import { api, ok } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import { selfUser } from "@/lib/serialize";
import { walletBalanceCents } from "@/lib/wallet";

export const GET = api(async () => {
  const user = await getSessionUser();
  if (!user) return ok({ user: null });
  const balance = await walletBalanceCents(user.id);
  return ok({ user: selfUser(user), balanceCents: balance });
});
