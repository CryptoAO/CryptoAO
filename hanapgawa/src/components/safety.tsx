"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchJson, timeAgo } from "@/lib/client";
import { Button, Card } from "@/components/ui";

/** Best-effort geolocation — never blocks the action it accompanies. */
function getCoords(timeoutMs = 6000): Promise<{ lat?: number; lng?: number }> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve({});
    let settled = false;
    const done = (v: { lat?: number; lng?: number }) => {
      if (!settled) {
        settled = true;
        resolve(v);
      }
    };
    setTimeout(() => done({}), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (p) => done({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => done({}),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}

interface CheckIn {
  id: string;
  kind: string;
  userId: string;
  firstName: string;
  hasLocation: boolean;
  note?: string | null;
  createdAt: string;
}

/**
 * Safety panel shown on an active booking. Two jobs:
 *  - a timestamped arrival/departure trail both sides can see
 *  - a panic button that texts the user's trusted contacts
 */
export function SafetyPanel({ jobId, meId }: { jobId: string; meId: string }) {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmSos, setConfirmSos] = useState(false);
  const [contactCount, setContactCount] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await fetchJson<{ checkIns: CheckIn[] }>(`/api/jobs/${jobId}/checkin`);
      setCheckIns(d.checkIns);
    } catch {
      /* panel just stays empty */
    }
  }, [jobId]);

  useEffect(() => {
    load();
    fetchJson<{ contacts: unknown[] }>("/api/me/contacts")
      .then((d) => setContactCount(d.contacts.length))
      .catch(() => setContactCount(null));
  }, [load]);

  const mine = checkIns.filter((c) => c.userId === meId);
  const arrived = mine.some((c) => c.kind === "ARRIVED");
  const left = mine.some((c) => c.kind === "LEFT");

  async function check(kind: "ARRIVED" | "LEFT") {
    setBusy(true);
    setMsg(null);
    try {
      const coords = await getCoords();
      await fetchJson(`/api/jobs/${jobId}/checkin`, {
        method: "POST",
        body: JSON.stringify({ kind, ...coords }),
      });
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function sendSos() {
    setBusy(true);
    setMsg(null);
    try {
      const coords = await getCoords(4000);
      const d = await fetchJson<{ contactsReached: number; totalContacts: number }>("/api/sos", {
        method: "POST",
        body: JSON.stringify({ jobId, ...coords }),
      });
      setConfirmSos(false);
      setMsg(
        d.contactsReached > 0
          ? `Naipadala na sa ${d.contactsReached} contact mo at sa support team. Kung delikado, tumawag sa 911.`
          : "Naitala na ang alert at na-notify ang support team. Wala kang trusted contact — tumawag sa 911 kung delikado.",
      );
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-3 border-amber-200">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">🛡️ Kaligtasan</h2>
        {contactCount === 0 && (
          <Link href="/me?tab=safety" className="text-xs font-semibold text-brand-800 underline">
            Magdagdag ng contact
          </Link>
        )}
      </div>

      <p className="text-sm text-gray-600">
        I-tap ang <strong>Nandito na ako</strong> pagdating mo. May makikita ang kasama mo, at may
        record kayo pareho kung sakaling may gulo.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          className="min-h-11 px-4 py-2 text-sm"
          disabled={busy || arrived}
          onClick={() => check("ARRIVED")}
        >
          {arrived ? "✔ Naka-check in" : "📍 Nandito na ako"}
        </Button>
        <Button
          variant="secondary"
          className="min-h-11 px-4 py-2 text-sm"
          disabled={busy || !arrived || left}
          onClick={() => check("LEFT")}
        >
          {left ? "✔ Naka-check out" : "👋 Aalis na ako"}
        </Button>
      </div>

      {checkIns.length > 0 && (
        <ul className="space-y-1 rounded-xl bg-stone-50 p-3 text-xs text-gray-600">
          {checkIns.map((c) => (
            <li key={c.id}>
              {c.kind === "ARRIVED" ? "📍" : "👋"} <strong>{c.firstName}</strong>{" "}
              {c.kind === "ARRIVED" ? "dumating" : "umalis"} · {timeAgo(c.createdAt)}
              {c.hasLocation && " · may lokasyon"}
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-stone-100 pt-3">
        {!confirmSos ? (
          <button
            onClick={() => setConfirmSos(true)}
            className="w-full rounded-xl border-2 border-red-600 py-3 text-base font-extrabold text-red-700 hover:bg-red-50"
          >
            🚨 SOS — kailangan ko ng tulong
          </button>
        ) : (
          <div className="space-y-2 rounded-xl bg-red-50 p-3">
            <p className="text-sm font-semibold text-red-800">
              Sigurado ka? Ipapadala namin ang alert sa trusted contacts mo at sa support team.
            </p>
            <p className="text-xs text-red-700">
              Kung may agarang panganib, <strong>tumawag muna sa 911</strong>.
            </p>
            <div className="flex gap-2">
              <Button variant="danger" className="min-h-11 flex-1 py-2" disabled={busy} onClick={sendSos}>
                {busy ? "Ipinapadala…" : "Oo, ipadala ang SOS"}
              </Button>
              <Button
                variant="ghost"
                className="min-h-11 py-2"
                disabled={busy}
                onClick={() => setConfirmSos(false)}
              >
                Hindi
              </Button>
            </div>
          </div>
        )}
      </div>

      {msg && <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">{msg}</div>}
    </Card>
  );
}

/* ---------------- Trusted contacts editor (profile tab) ---------------- */

interface Contact {
  id: string;
  name: string;
  phoneMasked: string;
  relation?: string | null;
}

export function TrustedContacts() {
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [max, setMax] = useState(3);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () =>
      fetchJson<{ contacts: Contact[]; max: number }>("/api/me/contacts")
        .then((d) => {
          setContacts(d.contacts);
          setMax(d.max);
        })
        .catch(() => setContacts([])),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await fetchJson("/api/me/contacts", {
        method: "POST",
        body: JSON.stringify({ name, phone, relation: relation || undefined }),
      });
      setName("");
      setPhone("");
      setRelation("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await fetchJson("/api/me/contacts", { method: "DELETE", body: JSON.stringify({ id }) });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (contacts === null) return null;

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-bold">🛡️ Trusted contacts</h2>
        <p className="mt-1 text-sm text-gray-600">
          Kapag nag-SOS ka habang may trabaho, tetext namin ang mga taong ito agad. Pumili ng
          kapamilya o kaibigan na madaling matawagan.
        </p>
      </div>

      {contacts.length === 0 ? (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          Wala ka pang trusted contact. Sobrang importante nito kung pupunta ka sa bahay ng hindi mo
          kakilala.
        </p>
      ) : (
        <ul className="space-y-2">
          {contacts.map((c) => (
            <li key={c.id} className="flex items-center justify-between rounded-xl bg-stone-50 p-3 text-sm">
              <span>
                <strong>{c.name}</strong>
                {c.relation ? ` (${c.relation})` : ""} · {c.phoneMasked}
              </span>
              <button
                onClick={() => remove(c.id)}
                disabled={busy}
                className="text-xs font-semibold text-red-600 underline"
              >
                Alisin
              </button>
            </li>
          ))}
        </ul>
      )}

      {contacts.length < max && (
        <form onSubmit={add} className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-3">
            <input
              className="min-h-12 rounded-xl border border-stone-300 px-4 text-base"
              placeholder="Pangalan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={60}
            />
            <input
              className="min-h-12 rounded-xl border border-stone-300 px-4 text-base"
              placeholder="09171234567"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <input
              className="min-h-12 rounded-xl border border-stone-300 px-4 text-base"
              placeholder="Asawa / Kapatid"
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
              maxLength={40}
            />
          </div>
          {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <Button type="submit" disabled={busy || !name || !phone} className="min-h-11 py-2">
            Idagdag
          </Button>
        </form>
      )}
    </Card>
  );
}
