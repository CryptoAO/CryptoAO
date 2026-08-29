import { NextRequest } from "next/server";
import { api, ok, ApiError, requireUser, audit, clientIp } from "@/lib/api";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/ratelimit";
import { MAX_DOC_BYTES, objectStore, sniffMime } from "@/lib/storage";

const MAX_AVATAR_BYTES = 3 * 1024 * 1024; // a phone selfie, not a portfolio

/**
 * Set your own profile photo.
 *
 * A face is the strongest trust signal in a marketplace where you let a
 * stranger into your home, so this is worth having — but it is also a
 * picture of a real person, usually a low-income worker, so it is stored
 * like every other image here: private store, unguessable key, no public
 * URL, and served only through an authenticated route.
 */
export const POST = api(async (req: NextRequest) => {
  const user = await requireUser();
  if (!rateLimit(`avatar:${user.id}`, 10, 60 * 60_000)) {
    throw new ApiError(429, "Sobrang dami ng palit — subukan mamaya");
  }

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared && declared > MAX_AVATAR_BYTES + 4096) {
    throw new ApiError(413, "Masyadong malaki — 3MB ang max");
  }

  const form = await req.formData().catch(() => null);
  if (!form) throw new ApiError(400, "Expected a file upload");
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "Walang larawan na na-attach");
  if (file.size === 0) throw new ApiError(400, "Empty file");
  if (file.size > MAX_AVATAR_BYTES) throw new ApiError(413, "Masyadong malaki — 3MB ang max");

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.byteLength > MAX_AVATAR_BYTES || buf.byteLength > MAX_DOC_BYTES) {
    throw new ApiError(413, "Masyadong malaki — 3MB ang max");
  }

  // Magic bytes, never the client's Content-Type. Images only: a PDF avatar
  // is not a thing, and a PDF can carry script.
  const mime = sniffMime(buf);
  if (!mime || !mime.startsWith("image/")) {
    throw new ApiError(400, "Larawan lang (JPG/PNG/WEBP) ang tinatanggap");
  }

  const store = objectStore();
  const stored = await store.put(`avatar/${user.id}`, buf, mime);
  const previous = user.photoKey;

  await db.user.update({
    where: { id: user.id },
    data: { photoKey: stored.key, photoMime: stored.mime },
  });
  // Replacing an earlier photo: delete the old bytes rather than orphan them.
  if (previous && previous !== stored.key) await store.remove(previous).catch(() => {});

  await audit("user.photo_set", { actorId: user.id, ip: clientIp(req) });
  return ok({ photoUrl: `/api/users/${user.id}/photo` }, 201);
});

/** Remove your own photo. */
export const DELETE = api(async (req: NextRequest) => {
  const user = await requireUser();
  if (user.photoKey) await objectStore().remove(user.photoKey).catch(() => {});
  await db.user.update({ where: { id: user.id }, data: { photoKey: null, photoMime: null } });
  await audit("user.photo_remove", { actorId: user.id, ip: clientIp(req) });
  return ok({ removed: true });
});
