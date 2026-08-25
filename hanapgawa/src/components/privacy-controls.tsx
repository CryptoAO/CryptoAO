"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchJson } from "@/lib/client";
import { Button, Card, ErrorNote, Input } from "@/components/ui";

interface Blocker { code: string; message: string }
interface ClosureCheck { canClose: boolean; blockers: Blocker[] }

/**
 * The Data Privacy Act rights the notice promises, as buttons.
 *
 * Kept at the bottom of the profile rather than behind a support email:
 * a right you have to ask permission to use is not much of a right, and
 * routing every request through one founder's inbox guarantees most people
 * never bother.
 */
export function PrivacyControls() {
  const router = useRouter();
  const [stage, setStage] = useState<"idle" | "checking" | "blocked" | "confirm" | "closing">("idle");
  const [check, setCheck] = useState<ClosureCheck | null>(null);
  const [password, setPassword] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startClosure() {
    setError(null);
    setStage("checking");
    try {
      const c = await fetchJson<ClosureCheck>("/api/me/close");
      setCheck(c);
      setStage(c.canClose ? "confirm" : "blocked");
    } catch (e) {
      setError((e as Error).message);
      setStage("idle");
    }
  }

  async function confirmClosure() {
    setError(null);
    setStage("closing");
    try {
      await fetchJson("/api/me/close", { method: "POST", body: JSON.stringify({ password }) });
      router.push("/");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setStage("confirm");
    }
  }

  return (
    <Card className="space-y-3">
      <h2 className="font-bold">Data at privacy</h2>
      <p className="text-sm text-gray-600">
        Sa ilalim ng <Link href="/privacy" className="underline">Data Privacy Act (RA 10173)</Link>,
        karapatan mong makita, makuha, at ipabura ang data mo. Libre — at hindi mo kailangang mag-email
        para gawin ito.
      </p>

      <a
        href="/api/me/export"
        download
        className="flex min-h-12 w-full items-center justify-center rounded-xl border border-brand-700 bg-white px-5 py-3 text-base font-semibold text-brand-800"
      >
        ⬇ I-download ang lahat ng data ko
      </a>
      <p className="text-xs text-gray-500">
        JSON file — profile, trabaho, offers, mensahe mo, reviews, at buong wallet history. Hindi kasama
        ang larawan ng ID mo; hindi namin iyon ipinapadala sa kahit anong link.
      </p>

      <div className="border-t border-stone-100 pt-3">
        {stage === "idle" && (
          <button onClick={startClosure} className="text-sm font-semibold text-red-600 underline">
            Isara ang account ko
          </button>
        )}

        {stage === "checking" && <p className="text-sm text-gray-500">Chine-check…</p>}

        {stage === "blocked" && check && (
          <div className="space-y-2 rounded-xl bg-amber-50 p-3">
            <p className="text-sm font-semibold text-amber-900">Hindi pa pwedeng isara:</p>
            <ul className="list-inside list-disc space-y-1 text-sm text-amber-900">
              {check.blockers.map((b) => <li key={b.code}>{b.message}</li>)}
            </ul>
            <button onClick={() => setStage("idle")} className="text-sm font-semibold text-gray-600 underline">
              Sige, ayusin ko muna
            </button>
          </div>
        )}

        {(stage === "confirm" || stage === "closing") && (
          <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-900">
              <strong>Hindi na ito maibabalik.</strong> Buburahin namin ang pangalan, number, at profile
              mo. Mananatili ang record ng bayaran at ang mga review na isinulat mo — bahagi na iyon ng
              reputasyon ng ibang tao at ng aming libro — pero wala nang pangalan mo.
            </p>
            <label className="flex items-start gap-2 text-sm text-red-900">
              <input
                type="checkbox"
                checked={understood}
                onChange={(e) => setUnderstood(e.target.checked)}
                className="mt-1 h-5 w-5 accent-red-600"
              />
              Naiintindihan ko at gusto kong ituloy.
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password mo"
              autoComplete="current-password"
            />
            <ErrorNote message={error} />
            <div className="flex gap-2">
              <Button
                variant="danger"
                disabled={stage === "closing" || !understood || password.length === 0}
                onClick={confirmClosure}
              >
                {stage === "closing" ? "Isinasara…" : "Isara ang account"}
              </Button>
              <Button variant="ghost" disabled={stage === "closing"} onClick={() => setStage("idle")}>
                Wag na lang
              </Button>
            </div>
          </div>
        )}

        {stage === "idle" && <ErrorNote message={error} />}
      </div>
    </Card>
  );
}
