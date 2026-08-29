// Job evidence photos.
//
// A dispute over a cleaning job is otherwise one person's word against
// another's, and support has to guess. A photo of the room before and after
// settles most of them in seconds — which is worth building even though
// photos of somebody's home are personal data and have to be handled as
// such.
//
// So evidence photos get the ID-document treatment, not the social-media
// treatment: private store, unguessable keys, no public URL, reads only by
// the two people on the booking and by support, and deleted once the window
// in which they could matter has closed.

import { ApiError } from "./api";
import { db } from "./db";
import { MAX_DOC_BYTES, objectStore, sniffMime } from "./storage";

export const PHOTO_KINDS = ["BEFORE", "AFTER", "ISSUE"] as const;
export type PhotoKind = (typeof PHOTO_KINDS)[number];

/** Per job, per person. Enough for a room-by-room record, not an album. */
export const MAX_PHOTOS_PER_UPLOADER = 8;

/**
 * States where a photo can still change an outcome. OPEN is absent — there
 * is no counterparty yet, so an "evidence" photo before booking is just an
 * unmoderated image with no audience. COMPLETED is absent too: once the
 * money has settled and no dispute was raised, new evidence changes nothing
 * and only adds data to hold.
 */
export const PHOTO_UPLOAD_STATES = ["BOOKED", "IN_PROGRESS", "DONE_BY_PROVIDER", "DISPUTED"];

/** How long a settled job's photos are kept before the bytes are deleted. */
export const RETENTION_DAYS = 90;

export function isPhotoKind(value: unknown): value is PhotoKind {
  return typeof value === "string" && (PHOTO_KINDS as readonly string[]).includes(value);
}

interface JobParties {
  clientId: string;
  assignedProviderId: string | null;
  status: string;
}

/** Pure so the access rules can be read, and tested, in one place. */
export function canViewPhotos(job: JobParties, viewerId: string | undefined, viewerIsAdmin: boolean): boolean {
  if (viewerIsAdmin) return true;
  if (!viewerId) return false;
  return viewerId === job.clientId || viewerId === job.assignedProviderId;
}

export function canUploadPhoto(job: JobParties, uploaderId: string): { ok: true } | { ok: false; reason: string } {
  if (uploaderId !== job.clientId && uploaderId !== job.assignedProviderId) {
    return { ok: false, reason: "Hindi ka kasali sa trabahong ito" };
  }
  if (!PHOTO_UPLOAD_STATES.includes(job.status)) {
    return { ok: false, reason: "Pwede lang maglagay ng litrato habang aktibo ang booking" };
  }
  return { ok: true };
}

export interface AddPhotoInput {
  jobId: string;
  uploaderId: string;
  kind: PhotoKind;
  caption?: string;
  bytes: Buffer;
}

export async function addJobPhoto(input: AddPhotoInput) {
  const job = await db.job.findUnique({
    where: { id: input.jobId },
    select: { id: true, clientId: true, assignedProviderId: true, status: true },
  });
  if (!job) throw new ApiError(404, "Job not found");

  const allowed = canUploadPhoto(job, input.uploaderId);
  if (!allowed.ok) throw new ApiError(403, allowed.reason);

  const existing = await db.jobPhoto.count({
    where: { jobId: job.id, uploaderId: input.uploaderId, purgedAt: null },
  });
  if (existing >= MAX_PHOTOS_PER_UPLOADER) {
    throw new ApiError(409, `Hanggang ${MAX_PHOTOS_PER_UPLOADER} litrato lang kada trabaho`);
  }

  if (input.bytes.byteLength > MAX_DOC_BYTES) {
    throw new ApiError(413, "Masyadong malaki ang litrato — 6MB ang max");
  }

  // Magic bytes, never the client's Content-Type. PDFs pass sniffMime for
  // identity documents but make no sense as job evidence, and a PDF can
  // carry script — so images only here.
  const mime = sniffMime(input.bytes);
  if (!mime || !mime.startsWith("image/")) {
    throw new ApiError(400, "Larawan lang (JPG/PNG/WEBP) ang tinatanggap dito");
  }

  const store = objectStore();
  const stored = await store.put(`jobphoto/${job.id}`, input.bytes, mime);

  return db.jobPhoto.create({
    data: {
      jobId: job.id,
      uploaderId: input.uploaderId,
      kind: input.kind,
      storageKey: stored.key,
      mime: stored.mime,
      bytes: stored.bytes,
      caption: input.caption?.trim().slice(0, 200) || null,
    },
  });
}

/** Metadata only — the bytes are never inlined into a JSON response. */
export function photoView(p: {
  id: string;
  jobId: string;
  uploaderId: string;
  kind: string;
  caption: string | null;
  bytes: number;
  purgedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: p.id,
    kind: p.kind,
    caption: p.caption,
    bytes: p.bytes,
    uploaderId: p.uploaderId,
    createdAt: p.createdAt,
    available: p.purgedAt == null,
    url: p.purgedAt == null ? `/api/jobs/${p.jobId}/photos/${p.id}` : null,
  };
}

export interface PurgeResult {
  scanned: number;
  purged: number;
  failed: number;
}

/**
 * Delete the bytes of photos on jobs that settled more than RETENTION_DAYS
 * ago, keeping the row so the record of "there was evidence" survives.
 * A dispute reopens nothing after three months; holding photos of people's
 * homes past that point is storage we cannot justify.
 */
export async function purgeOldPhotos(): Promise<PurgeResult> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 3_600_000);
  const stale = await db.jobPhoto.findMany({
    where: {
      purgedAt: null,
      job: { status: { in: ["COMPLETED", "CANCELLED"] }, updatedAt: { lt: cutoff } },
    },
    select: { id: true, storageKey: true },
    take: 500,
  });

  const store = objectStore();
  const result: PurgeResult = { scanned: stale.length, purged: 0, failed: 0 };
  for (const photo of stale) {
    try {
      await store.remove(photo.storageKey);
      await db.jobPhoto.update({ where: { id: photo.id }, data: { purgedAt: new Date() } });
      result.purged++;
    } catch {
      // One unreadable key must not stop the rest of the purge.
      result.failed++;
    }
  }
  return result;
}
