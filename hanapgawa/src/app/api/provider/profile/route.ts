import { api, ok, ApiError, parseBody, requireVerifiedUser, audit, clientIp } from "@/lib/api";
import { db } from "@/lib/db";
import { providerProfileSchema } from "@/lib/validation";
import { parsePhpToCents } from "@/lib/money";

// Become a provider / update provider profile: categories offered,
// indicative rates, and weekly availability.
export const POST = api(async (req) => {
  const user = await requireVerifiedUser();
  const body = await parseBody(req, providerProfileSchema);

  const categoryIds = body.categories.map((c) => c.categoryId);
  if (new Set(categoryIds).size !== categoryIds.length) {
    throw new ApiError(400, "Duplicate category selected");
  }
  const validCount = await db.category.count({ where: { id: { in: categoryIds }, active: true } });
  if (validCount !== categoryIds.length) throw new ApiError(400, "Invalid category selected");

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { isProvider: true, bio: body.bio ?? user.bio },
    });
    await tx.providerCategory.deleteMany({ where: { providerId: user.id } });
    for (const c of body.categories) {
      await tx.providerCategory.create({
        data: {
          providerId: user.id,
          categoryId: c.categoryId,
          headline: c.headline,
          rateCents: c.ratePhp != null ? parsePhpToCents(c.ratePhp) : null,
          rateUnit: c.rateUnit,
          yearsExp: c.yearsExp,
        },
      });
    }
    await tx.availabilitySlot.deleteMany({ where: { providerId: user.id } });
    for (const s of body.availability) {
      await tx.availabilitySlot.create({
        data: { providerId: user.id, weekday: s.weekday, startMin: s.startMin, endMin: s.endMin },
      });
    }
  });

  await audit("provider.profile_update", { actorId: user.id, ip: clientIp(req) });
  return ok({ done: true });
});
