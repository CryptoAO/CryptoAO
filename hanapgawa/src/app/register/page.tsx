"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchJson } from "@/lib/client";
import { Button, Card, ErrorNote, Field, Input } from "@/components/ui";
import { LocationPicker } from "@/components/locationpicker";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [regionCode, setRegionCode] = useState("");
  const [cityCode, setCityCode] = useState("");
  const [wantsProvider, setWantsProvider] = useState(false);
  const [agree, setAgree] = useState(false);
  const [code, setCode] = useState("");

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await fetchJson("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ firstName, lastName, phone, password, regionCode, cityCode, wantsProvider, agree }),
      });
      setStep("otp");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await fetchJson("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ phone, code }),
      });
      router.push(wantsProvider ? "/me?tab=provider" : "/jobs");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-extrabold">Gumawa ng account</h1>
      <p className="text-sm text-gray-600">
        Libre mag-sign up. Kailangan lang ang cellphone number mo — walang email na kailangan.
      </p>

      {step === "form" ? (
        <Card>
          <form onSubmit={submitForm} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Pangalan">
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required maxLength={60} placeholder="Juan" />
              </Field>
              <Field label="Apelyido">
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required maxLength={60} placeholder="dela Cruz" />
              </Field>
            </div>
            <Field label="Cellphone number" hint="Padadalhan ka namin ng 6-digit code para i-verify.">
              <Input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="09171234567"
              />
            </Field>
            <Field label="Password" hint="Minimum 8 characters. Wag gamitin ang birthday mo. 🙂">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} maxLength={72} />
            </Field>
            <LocationPicker regionCode={regionCode} cityCode={cityCode} onChange={(r, c) => { setRegionCode(r); setCityCode(c); }} />
            <label className="flex items-start gap-3 rounded-xl bg-brand-50 p-3">
              <input
                type="checkbox"
                checked={wantsProvider}
                onChange={(e) => setWantsProvider(e.target.checked)}
                className="mt-1 h-5 w-5 accent-brand-700"
              />
              <span className="text-sm">
                <strong>Gusto kong kumita dito.</strong> I-set up ang provider profile ko pagkatapos
                (labada, linis, hatid, at iba pa).
              </span>
            </label>
            <ErrorNote message={error} />
            <Button type="submit" full disabled={busy || !regionCode || !cityCode || !agree}>
              {busy ? "Sandali lang…" : "Magpatuloy →"}
            </Button>
            <label className="flex items-start gap-3 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                required
                className="mt-0.5 h-5 w-5 shrink-0 accent-brand-700"
              />
              <span>
                <strong>18 taong gulang pataas ako</strong> at sumasang-ayon sa{" "}
                <Link href="/terms" className="underline">Terms of Service</Link> at{" "}
                <Link href="/privacy" className="underline">Privacy Notice</Link>.
              </span>
            </label>
          </form>
        </Card>
      ) : (
        <Card>
          <form onSubmit={submitOtp} className="space-y-4">
            <p className="text-sm text-gray-700">
              Nagpadala kami ng <strong>6-digit code</strong> sa <strong>{phone}</strong>. Ilagay dito:
            </p>
            <Input
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="w-full min-h-12 rounded-xl border border-stone-300 px-4 py-3 text-center text-2xl tracking-[0.5em]"
              placeholder="••••••"
              required
            />
            <ErrorNote message={error} />
            <Button type="submit" full disabled={busy || code.length !== 6}>
              {busy ? "Chine-check…" : "I-verify"}
            </Button>
            <button
              type="button"
              className="w-full text-center text-sm font-semibold text-brand-800 underline"
              onClick={() => fetchJson("/api/auth/resend-otp", { method: "POST", body: JSON.stringify({ phone }) }).catch(() => {})}
            >
              Hindi dumating? Magpadala ulit ng code
            </button>
          </form>
        </Card>
      )}

      <p className="text-center text-sm text-gray-600">
        May account ka na? <Link href="/login" className="font-bold text-brand-800 underline">Mag-login</Link>
      </p>
    </div>
  );
}
