import { NextRequest, NextResponse } from "next/server";
import { api, ok, ApiError, requireUser, audit, clientIp } from "@/lib/api";
import { db } from "@/lib/db";
import { objectStore } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Serve a profile photo.
 *
 * Signed-in callers only, which is a deliberate trade. Anonymous visitors
 * browsing the provider list see initials instead of faces, and that costs
 * a little trust at the very top of the funnel — but the alternative is a
 * publicly addressable, scrapeable photograph of every low-income worker on
 * the platform, indexed by anyone who wants a face database. Signing up is
 * one tap; that is the cheaper side of the trade.
 */
export const GET = api(async (_req: NextRequest, ctx) => {
  const { id } = await (ctx as Ctx).params;
  await requireUser();

  const user = await db.user.findUnique({
    where: { id },
    select: { photoKey: true, photoMime: true, status: true },
  });
  if (!user?.photoKey) throw new ApiError(404, "No photo");
  // A closed or banned account's face stops being served immediately.
  if (user.status !== "ACTIVE" && user.status !== "FLAGGED") throw new ApiError(404, "No photo");

  const bytes = await objectStore().get(user.photoKey);
  if (!bytes) throw new ApiError(404, "No photo");

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": user.photoMime ?? "image/jpeg",
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": "inline",
      // No-store, not a short private cache: phones here are frequently
      // shared, and the same reasoning that keeps the service worker away
      // from personal data applies to a face sitting in the HTTP cache.
      // (The file middleware sets this too — kept here so the route is
      // correct on its own if the matcher ever changes.)
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    },
  });
});

/** Support takedown for an inappropriate or impersonating photo. */
export const DELETE = api(async (req: NextRequest, ctx) => {
  const { id } = await (ctx as Ctx).params;
  const admin = await requireUser();
  if (!admin.isAdmin) throw new ApiError(403, "Admin only");

  const target = await db.user.findUnique({ where: { id }, select: { photoKey: true } });
  if (!target) throw new ApiError(404, "User not found");
  if (target.photoKey) await objectStore().remove(target.photoKey).catch(() => {});
  await db.user.update({ where: { id }, data: { photoKey: null, photoMime: null } });

  await audit("admin.photo_takedown", {
    actorId: admin.id,
    targetType: "User",
    targetId: id,
    ip: clientIp(req),
  });
  return ok({ removed: true });
});
