"use client";

import { useRef, useState } from "react";
import { fetchJson } from "@/lib/client";
import { ErrorNote } from "@/components/ui";

function initials(firstName?: string, lastInitial?: string): string {
  const a = firstName?.trim()?.[0] ?? "?";
  const b = lastInitial?.trim()?.[0] ?? "";
  return (a + b).toUpperCase();
}

/**
 * A face, or the next best thing.
 *
 * Anonymous visitors cannot load photos (they are served only to signed-in
 * callers), so this always has to degrade to something that looks
 * deliberate. Initials on a brand chip read as a design choice; a broken
 * image reads as a broken app.
 */
export function Avatar({
  photoUrl,
  firstName,
  lastInitial,
  size = 40,
  className = "",
}: {
  photoUrl?: string | null;
  firstName?: string;
  lastInitial?: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const px = { width: size, height: size };

  if (!photoUrl || failed) {
    return (
      <span
        aria-hidden
        style={{ ...px, fontSize: Math.max(11, Math.round(size * 0.36)) }}
        className={`grid shrink-0 place-items-center rounded-full bg-brand-100 font-bold text-brand-800 ${className}`}
      >
        {initials(firstName, lastInitial)}
      </span>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={photoUrl}
      alt={firstName ? `Larawan ni ${firstName}` : "Profile photo"}
      style={px}
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-full object-cover ${className}`}
      loading="lazy"
    />
  );
}

/** Set or remove your own photo. */
export function AvatarUploader({
  photoUrl,
  firstName,
  onChange,
}: {
  photoUrl?: string | null;
  firstName?: string;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      // Multipart: setting Content-Type by hand would strip the boundary.
      const res = await fetch("/api/me/photo", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Hindi na-upload ang larawan");
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await fetchJson("/api/me/photo", { method: "DELETE" });
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="mb-2 block text-sm font-semibold text-gray-800">Profile photo</span>
      <div className="flex items-center gap-3">
        {/* Cache-busted so a replaced photo does not keep showing the old one. */}
        <Avatar photoUrl={photoUrl ? `${photoUrl}?v=${busy ? "x" : Date.now()}` : null} firstName={firstName} size={64} />
        <div className="flex flex-col gap-1">
          <label className="cursor-pointer text-sm font-semibold text-brand-800 underline">
            {busy ? "Sandali lang…" : photoUrl ? "Palitan ang larawan" : "Maglagay ng larawan"}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="user"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
              }}
            />
          </label>
          {photoUrl && (
            <button onClick={remove} disabled={busy} className="text-left text-xs text-gray-500 underline">
              Tanggalin
            </button>
          )}
        </div>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Makikita lang ito ng mga naka-sign in. Malinaw na mukha, walang ibang tao sa larawan.
      </p>
      <ErrorNote message={error} />
    </div>
  );
}
