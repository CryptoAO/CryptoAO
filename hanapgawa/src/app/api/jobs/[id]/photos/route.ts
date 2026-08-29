import { NextRequest } from "next/server";
import { api, ok, ApiError, requireUser, requireVerifiedUser, audit, clientIp } from "@/lib/api";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/ratelimit";
import { MAX_DOC_BYTES } from "@/lib/storage";
import { addJobPhoto, canViewPhotos, isPhotoKind, photoView } from "@/lib/photos";

type Ctx = { params: Promise<{ id: string }> };

/** Photo metadata for one booking. Parties and support only. */
export const GET = api(async (_req: NextRequest, ctx) => {
  const { id } = await (ctx as Ctx).params;
  const user = await requireUser();

  const job = await db.job.findUnique({
    where: { id },
    select: { clientId: true, assignedProviderId: true, status: true },
  });
  if (!job) throw new ApiError(404, "Job not found");
  // 404, not 403: whether a job exists is itself information.
  if (!canViewPhotos(job, user.id, user.isAdmin)) throw new ApiError(404, "Job not found");

  const photos = await db.jobPhoto.findMany({
    where: { jobId: id },
    orderBy: { createdAt: "asc" },
  });
  return ok({ photos: photos.map((p) => photoView(p)) });
});

/** Attach an evidence photo to a booking you are part of. */
export const POST = api(async (req: NextRequest, ctx) => {
  const { id } = await (ctx as Ctx).params;
  const user = await requireVerifiedUser();
  if (!rateLimit(`jobphoto:${user.id}`, 30, 60 * 60_000)) {
    throw new ApiError(429, "Sobrang dami ng upload — subukan mamaya");
  }

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared && declared > MAX_DOC_BYTES + 4096) {
    throw new ApiError(413, "Masyadong malaki ang litrato — 6MB ang max");
  }

  const form = await req.formData().catch(() => null);
  if (!form) throw new ApiError(400, "Expected a file upload");

  const kind = form.get("kind");
  if (!isPhotoKind(kind)) throw new ApiError(400, "kind must be BEFORE, AFTER or ISSUE");

  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "Walang litrato na na-attach");
  if (file.size === 0) throw new ApiError(400, "Empty file");
  if (file.size > MAX_DOC_BYTES) throw new ApiError(413, "Masyadong malaki ang litrato — 6MB ang max");

  const caption = form.get("caption");
  const photo = await addJobPhoto({
    jobId: id,
    uploaderId: user.id,
    kind,
    caption: typeof caption === "string" ? caption : undefined,
    bytes: Buffer.from(await file.arrayBuffer()),
  });

  await audit("job.photo_upload", {
    actorId: user.id,
    targetType: "Job",
    targetId: id,
    meta: { kind: photo.kind, mime: photo.mime, bytes: photo.bytes },
    ip: clientIp(req),
  });

  return ok({ photo: photoView(photo) }, 201);
});
