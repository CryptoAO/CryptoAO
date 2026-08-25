import "./demo"; // demo deployments move private storage under /tmp
import { createHash, randomBytes } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

// Private object storage for identity documents.
//
// These images are the most sensitive data in the system — a scan of
// someone's PhilSys ID is worth more to a fraudster than their password.
// Rules enforced here:
//   1. Files NEVER live under a web-servable path. Local dev writes to
//      var/private/ (gitignored); production uses an S3-compatible bucket
//      with public access blocked.
//   2. Keys are unguessable (random, not sequential), so a leaked key names
//      exactly one document and nothing else.
//   3. Reads go through an authenticated route, never a direct URL.

export interface StoredObject {
  key: string;
  mime: string;
  bytes: number;
  sha256: string;
}

export interface ObjectStore {
  put(prefix: string, data: Buffer, mime: string): Promise<StoredObject>;
  get(key: string): Promise<Buffer | null>;
  remove(key: string): Promise<void>;
}

/** Reject anything that could escape the storage root. */
function assertSafeKey(key: string) {
  if (!/^[a-z0-9/_-]+\.[a-z0-9]+$/i.test(key) || key.includes("..") || key.startsWith("/")) {
    throw new Error("Invalid storage key");
  }
}

class LocalStore implements ObjectStore {
  private root = process.env.PRIVATE_STORAGE_DIR || path.join(process.cwd(), "var", "private");

  async put(prefix: string, data: Buffer, mime: string): Promise<StoredObject> {
    const ext = EXT_BY_MIME[mime] ?? "bin";
    const key = `${prefix}/${randomBytes(24).toString("hex")}.${ext}`;
    assertSafeKey(key);
    const full = path.join(this.root, key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data, { mode: 0o600 });
    return {
      key,
      mime,
      bytes: data.byteLength,
      sha256: createHash("sha256").update(data).digest("hex"),
    };
  }

  async get(key: string): Promise<Buffer | null> {
    assertSafeKey(key);
    const full = path.join(this.root, key);
    // Belt and braces: the resolved path must still sit inside the root.
    if (!path.resolve(full).startsWith(path.resolve(this.root) + path.sep)) {
      throw new Error("Invalid storage key");
    }
    try {
      return await readFile(full);
    } catch {
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    assertSafeKey(key);
    const full = path.join(this.root, key);
    if (!path.resolve(full).startsWith(path.resolve(this.root) + path.sep)) return;
    await unlink(full).catch(() => {});
  }
}

export function objectStore(): ObjectStore {
  // Production swaps in an S3/R2 implementation behind this same interface.
  // Kept local-only for now so nothing silently depends on a bucket that
  // has not been created and locked down yet.
  return new LocalStore();
}

/* ------------------------- content validation ------------------------- */

export const MAX_DOC_BYTES = 6 * 1024 * 1024; // 6 MB — a phone photo, not a scan farm

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/**
 * Identify a file by its magic bytes, NOT by the client-supplied
 * Content-Type — a browser (or an attacker) can claim anything. Returns
 * null for any format we don't accept, which includes SVG (scriptable)
 * and HTML masquerading as an image.
 */
export function sniffMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return "image/png";
  }
  // WEBP: "RIFF" .... "WEBP"
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  // PDF: "%PDF-"
  if (buf.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
  return null;
}

export const ACCEPTED_DOC_MIMES = Object.keys(EXT_BY_MIME);
