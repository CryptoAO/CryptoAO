import { api, ok, requireUser } from "@/lib/api";
import { db } from "@/lib/db";
import { providerReadiness } from "@/lib/readiness";

/**
 * What is still standing between this provider and being reachable by the
 * job broadcast. Own-account only — readiness is a to-do list, not a public
 * profile signal, and exposing another provider's gaps would be a gift to
 * anyone building a competitor's poaching list.
 */
export const GET = api(async () => {
  const user = await requireUser();
  if (!user.isProvider) return ok({ readiness: null });

  const [categories, trustedContacts] = await Promise.all([
    db.providerCategory.findMany({
      where: { providerId: user.id },
      select: { rateCents: true },
    }),
    db.trustedContact.count({ where: { userId: user.id } }),
  ]);

  const readiness = providerReadiness({
    kycLevel: user.kycLevel,
    categoryCount: categories.length,
    categoriesWithRate: categories.filter((c) => c.rateCents != null && c.rateCents > 0).length,
    bioLength: user.bio?.trim().length ?? 0,
    trustedContactCount: trustedContacts,
  });

  return ok({ readiness });
});
