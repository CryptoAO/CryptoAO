import { describe, expect, it } from "vitest";
import {
  MAX_PHOTOS_PER_UPLOADER,
  PHOTO_UPLOAD_STATES,
  canUploadPhoto,
  canViewPhotos,
  isPhotoKind,
  photoView,
} from "../src/lib/photos";
import { JOB_STATUSES } from "../src/lib/jobs";

const job = {
  clientId: "client-1",
  assignedProviderId: "provider-1",
  status: "IN_PROGRESS",
};

describe("canViewPhotos — a photo of someone's home is not public", () => {
  it("lets the client see them", () => {
    expect(canViewPhotos(job, "client-1", false)).toBe(true);
  });

  it("lets the booked provider see them", () => {
    expect(canViewPhotos(job, "provider-1", false)).toBe(true);
  });

  it("lets support see them — that is the point of evidence", () => {
    expect(canViewPhotos(job, "some-admin", true)).toBe(true);
  });

  it("shuts out every other signed-in user", () => {
    expect(canViewPhotos(job, "stranger", false)).toBe(false);
  });

  it("shuts out anonymous callers", () => {
    expect(canViewPhotos(job, undefined, false)).toBe(false);
  });

  it("shuts out a provider who was not booked on this job", () => {
    expect(canViewPhotos({ ...job, assignedProviderId: "someone-else" }, "provider-1", false)).toBe(false);
  });
});

describe("canUploadPhoto", () => {
  it("accepts either party on an active booking", () => {
    expect(canUploadPhoto(job, "client-1").ok).toBe(true);
    expect(canUploadPhoto(job, "provider-1").ok).toBe(true);
  });

  it("refuses a stranger with a reason, not a bare no", () => {
    const r = canUploadPhoto(job, "stranger");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason.length).toBeGreaterThan(10);
  });

  it("refuses on an OPEN job — there is no counterparty to show it to yet", () => {
    expect(canUploadPhoto({ ...job, status: "OPEN" }, "client-1").ok).toBe(false);
  });

  it("refuses once the money has settled", () => {
    expect(canUploadPhoto({ ...job, status: "COMPLETED" }, "client-1").ok).toBe(false);
    expect(canUploadPhoto({ ...job, status: "CANCELLED" }, "client-1").ok).toBe(false);
  });

  it("still accepts during a dispute — that is when evidence matters most", () => {
    expect(canUploadPhoto({ ...job, status: "DISPUTED" }, "provider-1").ok).toBe(true);
  });

  it("covers exactly the unsettled job states", () => {
    const settled = ["OPEN", "COMPLETED", "CANCELLED"];
    const expected = JOB_STATUSES.filter((s) => !settled.includes(s));
    expect([...PHOTO_UPLOAD_STATES].sort()).toEqual([...expected].sort());
  });
});

describe("isPhotoKind", () => {
  it("accepts the three real kinds", () => {
    expect(isPhotoKind("BEFORE")).toBe(true);
    expect(isPhotoKind("AFTER")).toBe(true);
    expect(isPhotoKind("ISSUE")).toBe(true);
  });

  it("rejects anything else, including near-misses and non-strings", () => {
    for (const v of ["before", "OTHER", "", null, undefined, 3, {}]) {
      expect(isPhotoKind(v)).toBe(false);
    }
  });
});

describe("photoView", () => {
  const base = {
    id: "p1",
    jobId: "j1",
    uploaderId: "u1",
    kind: "BEFORE",
    caption: "Sala bago linisin",
    bytes: 12345,
    purgedAt: null as Date | null,
    createdAt: new Date("2026-08-25T00:00:00Z"),
  };

  it("never leaks the storage key", () => {
    expect(JSON.stringify(photoView(base))).not.toContain("storageKey");
  });

  it("routes the image through the authenticated endpoint, not a bucket", () => {
    expect(photoView(base).url).toBe("/api/jobs/j1/photos/p1");
  });

  it("drops the url once the bytes are gone, so the UI shows a gap not a 410", () => {
    const purged = photoView({ ...base, purgedAt: new Date() });
    expect(purged.available).toBe(false);
    expect(purged.url).toBeNull();
  });
});

describe("limits", () => {
  it("caps an album at a room-by-room record, not a photo dump", () => {
    expect(MAX_PHOTOS_PER_UPLOADER).toBeGreaterThanOrEqual(4);
    expect(MAX_PHOTOS_PER_UPLOADER).toBeLessThanOrEqual(12);
  });
});
