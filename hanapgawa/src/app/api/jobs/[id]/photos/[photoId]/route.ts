import { NextRequest, NextResponse } from "next/server";
import { api, ApiError, requireUser, audit, clientIp, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { objectStore } from "@/lib/storage";
import { canViewPhotos } from "@/lib/photos";

type Ctx = { params: Promise<{ id: string; photoId: string }> };

/**
 * Stream one evidence photo. There is no public URL for these — every read
 * goes through this route so the two parties and support are the only people
 * who can ever see the inside of somebody's house.
 */
export const GET = api(async (req: NextRequest, ctx) => {
  const { id, photoId } = await (ctx as Ctx).params;
  const user = await requireUser();

  const photo = await db.jobPhoto.findUnique({
    where: { id: photoId },
    include: { job: { select: { id: true, clientId: true, assignedProviderId: true, status: true } } },
  });
  if (!photo || photo.jobId !== id) throw new ApiError(404, "Photo not found");
  if (!canViewPhotos(photo.job, user.id, user.isAdmin)) throw new ApiError(404, "Photo not found");
  if (photo.purgedAt) throw new ApiError(410, "Nabura na ang litratong ito");

  const bytes = await objectStore().get(photo.storageKey);
  if (!bytes) throw new ApiError(410, "Wala na ang file na ito");

  // Support reading a private photo is a real event; the parties reading
  // their own is not, and logging every thumbnail would drown the log.
  if (user.isAdmin && user.id !== photo.job.clientId && user.id !== photo.job.assignedProviderId) {
    await audit("job.photo_view_admin", {
      actorId: user.id,
      targetType: "JobPhoto",
      targetId: photo.id,
      ip: clientIp(req),
    });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": photo.mime,
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});

/** Remove your own photo. Support can remove any. */
export const DELETE = api(async (req: NextRequest, ctx) => {
  const { id, photoId } = await (ctx as Ctx).params;
  const user = await requireUser();

  const photo = await db.jobPhoto.findUnique({ where: { id: photoId } });
  if (!photo || photo.jobId !== id) throw new ApiError(404, "Photo not found");
  if (photo.uploaderId !== user.id && !user.isAdmin) throw new ApiError(403, "Hindi mo ito litrato");

  if (!photo.purgedAt) await objectStore().remove(photo.storageKey);
  await db.jobPhoto.delete({ where: { id: photo.id } });

  await audit("job.photo_delete", {
    actorId: user.id,
    targetType: "JobPhoto",
    targetId: photo.id,
    ip: clientIp(req),
  });
  return ok({ deleted: true });
});
