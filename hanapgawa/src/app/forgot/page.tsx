"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchJson } from "@/lib/client";
import { Button, Card, ErrorNote, Field, Input } from "@/components/ui";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const d = await fetchJson<{ devCode?: string }>("/api/auth/reset", {
        method: "POST",
        body: JSON.stringify({ step: "request", phone }),
      });
      if (d.devCode) setDevCode(d.devCode);
      setStep("code");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmReset(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await fetchJson("/api/auth/reset", {
        method: "POST",
        body: JSON.stringify({ step: "confirm", phone, code, password }),
      });
      router.push("/jobs");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-extrabold">Nakalimutan ang password</h1>

      {step === "phone" ? (
        <Card>
          <form onSubmit={requestCode} className="space-y-4">
            <p className="text-sm text-gray-600">
              Ilagay ang cellphone number mo. Padadalhan ka namin ng 6-digit code para makagawa ng bagong password.
            </p>
            <Field label="Cellphone number">
              <Input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="09171234567"
              />
            </Field>
            <ErrorNote message={error} />
            <Button type="submit" full disabled={busy}>
              {busy ? "Nagpapadala…" : "Ipadala ang code"}
            </Button>
          </form>
        </Card>
      ) : (
        <Card>
          <form onSubmit={confirmReset} className="space-y-4">
            <p className="text-sm text-gray-700">
              Kung may account sa <strong>{phone}</strong>, may code na naipadala. Ilagay ito at ang bago mong password.
            </p>
            {devCode && (
              <p className="rounded-xl bg-amber-50 p-3 text-center text-sm text-amber-900">
                🧪 Demo lang: walang totoong SMS. Ang code mo ay{" "}
                <strong className="font-mono text-lg tracking-widest">{devCode}</strong>
              </p>
            )}
            <Field label="6-digit code">
              <Input
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                required
                placeholder="••••••"
                className="w-full min-h-12 rounded-xl border border-stone-300 px-4 py-3 text-center text-2xl tracking-[0.5em]"
              />
            </Field>
            <Field label="Bagong password" hint="Minimum 8 characters.">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                maxLength={72}
              />
            </Field>
            <div className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
              ⚠️ Kapag napalitan ang password, ma-lo-log out ang lahat ng device na naka-sign in sa account mo.
            </div>
            <ErrorNote message={error} />
            <Button type="submit" full disabled={busy || code.length !== 6}>
              {busy ? "Pinapalitan…" : "Palitan ang password"}
            </Button>
            <button
              type="button"
              className="w-full text-center text-sm font-semibold text-brand-800 underline"
              onClick={() => setStep("phone")}
            >
              Mali ang number? Bumalik
            </button>
          </form>
        </Card>
      )}

      <p className="text-center text-sm text-gray-600">
        <Link href="/login" className="font-bold text-brand-800 underline">
          Bumalik sa login
        </Link>
      </p>
    </div>
  );
}
