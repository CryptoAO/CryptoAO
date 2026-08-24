import { NextRequest } from "next/server";
import { api, ok, ApiError, requireVerifiedUser, audit, clientIp } from "@/lib/api";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/ratelimit";
import { MAX_DOC_BYTES, objectStore, sniffMime } from "@/lib/storage";

/**
 * Attach an ID photo to the caller's own PENDING KYC submission.
 *
 * Security posture: the file is identified by magic bytes (never the
 * client's Content-Type), size-capped before it is read into memory, stored
 * under an unguessable key outside any web-servable directory, and only
 * ever readable through the admin route. Replacing a document deletes the
 * previous file rather than orphaning it.
 */
export const POST = api(async (req: NextRequest) => {
  const user = await requireVerifiedUser();
  if (!rateLimit(`kycdoc:${user.id}`, 10, 60 * 60_000)) {
    throw new ApiError(429, "Too many uploads — try again later");
  }

  // Reject oversized bodies before buffering, when the client declares length.
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared && declared > MAX_DOC_BYTES + 4096) {
    throw new ApiError(413, "Masyadong malaki ang file — 6MB ang max");
  }

  const form = await req.formData().catch(() => null);
  if (!form) throw new ApiError(400, "Expected a file upload");

  const submissionId = String(form.get("submissionId") ?? "");
  const file = form.get("file");
  if (!submissionId) throw new ApiError(400, "submissionId is required");
  if (!(file instanceof File)) throw new ApiError(400, "Walang file na na-attach");
  if (file.size === 0) throw new ApiError(400, "Empty file");
  if (file.size > MAX_DOC_BYTES) throw new ApiError(413, "Masyadong malaki ang file — 6MB ang max");

  // Ownership + state: you may only attach to your own pending submission.
  const submission = await db.kycSubmission.findUnique({ where: { id: submissionId } });
  if (!submission || submission.userId !== user.id) throw new ApiError(404, "Submission not found");
  if (submission.status !== "PENDING") throw new ApiError(409, "Nasuri na ang submission na ito");

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.byteLength > MAX_DOC_BYTES) throw new ApiError(413, "Masyadong malaki ang file — 6MB ang max");

  const mime = sniffMime(buf);
  if (!mime) {
    throw new ApiError(400, "Larawan (JPG/PNG/WEBP) o PDF lang ang tinatanggap namin");
  }

  const store = objectStore();
  const stored = await store.put(`kyc/${user.id}`, buf, mime);

  // Replacing an earlier upload: delete the old bytes, don't orphan them.
  const previous = submission.docRef;
  await db.kycSubmission.update({
    where: { id: submission.id },
    data: { docRef: stored.key, docMime: stored.mime, docBytes: stored.bytes, docPurgedAt: null },
  });
  if (previous && previous !== stored.key) await store.remove(previous);

  await audit("kyc.doc_upload", {
    actorId: user.id,
    targetType: "KycSubmission",
    targetId: submission.id,
    // Hash, not content — enough to prove which file was reviewed later.
    meta: { mime: stored.mime, bytes: stored.bytes, sha256: stored.sha256 },
    ip: clientIp(req),
  });

  return ok({ uploaded: true, mime: stored.mime, bytes: stored.bytes }, 201);
});
