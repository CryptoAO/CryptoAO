"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchJson } from "@/lib/client";
import { ErrorNote } from "@/components/ui";

interface Photo {
  id: string;
  kind: "BEFORE" | "AFTER" | "ISSUE";
  caption: string | null;
  uploaderId: string;
  createdAt: string;
  available: boolean;
  url: string | null;
}

const KINDS: { id: Photo["kind"]; label: string; hint: string }[] = [
  { id: "BEFORE", label: "Bago", hint: "Kuha bago simulan" },
  { id: "AFTER", label: "Pagkatapos", hint: "Kuha kapag tapos na" },
  { id: "ISSUE", label: "Problema", hint: "Kung may sira o kulang" },
];

const KIND_LABEL: Record<string, string> = { BEFORE: "Bago", AFTER: "Pagkatapos", ISSUE: "Problema" };

/**
 * Evidence photos on an active booking.
 *
 * Both sides can add them and both sides can see all of them — a record only
 * one party can produce is not evidence, it is an accusation. Support sees
 * them too, which is the whole point: it turns "he said, she said" into
 * something a person can look at.
 */
export function JobPhotos({ jobId, meId }: { jobId: string; meId: string }) {
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [kind, setKind] = useState<Photo["kind"]>("BEFORE");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    fetchJson<{ photos: Photo[] }>(`/api/jobs/${jobId}/photos`)
      .then((d) => setPhotos(d.photos))
      .catch(() => setPhotos([]));
  }, [jobId]);

  useEffect(load, [load]);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("kind", kind);
      // Not fetchJson: this is multipart, and setting Content-Type by hand
      // would strip the boundary the server needs to parse it.
      const res = await fetch(`/api/jobs/${jobId}/photos`, { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Hindi na-upload ang litrato");
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      await fetchJson(`/api/jobs/${jobId}/photos/${id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const mine = photos?.filter((p) => p.uploaderId === meId).length ?? 0;

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold">Litrato ng trabaho</h3>
        <span className="text-xs text-gray-500">{mine}/8 sa'yo</span>
      </div>
      <p className="mt-1 text-xs text-gray-600">
        Makikita ito ng inyong dalawa at ng support. Ito ang pinakamabilis na paraan para maayos ang
        anumang di-pagkakaunawaan.
      </p>

      {photos && photos.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <li key={p.id} className="relative">
              {p.available && p.url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={p.url}
                  alt={p.caption ?? KIND_LABEL[p.kind] ?? "Litrato"}
                  className="h-24 w-full rounded-lg object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="grid h-24 w-full place-items-center rounded-lg bg-stone-200 text-center text-[10px] text-gray-500">
                  Nabura na
                </div>
              )}
              <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {KIND_LABEL[p.kind] ?? p.kind}
              </span>
              {p.uploaderId === meId && p.available && (
                <button
                  onClick={() => remove(p.id)}
                  aria-label="Burahin ang litrato"
                  className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap gap-1">
        {KINDS.map((k) => (
          <button
            key={k.id}
            onClick={() => setKind(k.id)}
            title={k.hint}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              kind === k.id ? "bg-brand-700 text-white" : "bg-white text-gray-600 ring-1 ring-stone-200"
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>

      <label className="mt-2 flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white px-4 text-sm font-semibold text-brand-800">
        {busy ? "Ina-upload…" : `📷 Magdagdag ng litrato (${KIND_LABEL[kind]})`}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }}
        />
      </label>
      <ErrorNote message={error} />
    </div>
  );
}
