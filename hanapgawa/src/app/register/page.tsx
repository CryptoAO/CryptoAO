"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchJson } from "@/lib/client";
import { Button, Card, ErrorNote, Field, Input } from "@/components/ui";
import { LocationPicker } from "@/components/locationpicker";
import { useT } from "@/lib/i18n";

export default function RegisterPage() {
  const router = useRouter();
  const t = useT();
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
  const [devCode, setDevCode] = useState<string | null>(null);

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const d = await fetchJson<{ devCode?: string }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ firstName, lastName, phone, password, regionCode, cityCode, wantsProvider, agree }),
      });
      if (d.devCode) setDevCode(d.devCode);
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
      <h1 className="text-2xl font-bold">{t("Gumawa ng account", "Create an account")}</h1>
      <p className="text-sm text-gray-600">
        {t("Libre mag-sign up. Kailangan lang ang cellphone number mo — walang email na kailangan.", "Signing up is free. All you need is your mobile number — no email required.")}
      </p>

      {step === "form" ? (
        <Card>
          <form onSubmit={submitForm} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("Pangalan", "First name")}>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required maxLength={60} placeholder="Juan" />
              </Field>
              <Field label={t("Apelyido", "Last name")}>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required maxLength={60} placeholder="dela Cruz" />
              </Field>
            </div>
            <Field label={t("Cellphone number", "Mobile number")} hint={t("Padadalhan ka namin ng 6-digit code para i-verify.", "We'll text you a 6-digit code to verify.")}>
              <Input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="09171234567"
              />
            </Field>
            <Field label="Password" hint={t("Minimum 8 characters. Wag gamitin ang birthday mo.", "Minimum 8 characters. Don't use your birthday.")}>
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
                <strong>{t("Gusto kong kumita dito.", "I want to earn here.")}</strong>{" "}
                {t("I-set up ang provider profile ko pagkatapos (labada, linis, hatid, at iba pa).", "Set up my provider profile afterwards (laundry, cleaning, driving, and more).")}
              </span>
            </label>
            <ErrorNote message={error} />
            <Button type="submit" full disabled={busy || !regionCode || !cityCode || !agree}>
              {busy ? t("Sandali lang…", "One moment…") : t("Magpatuloy →", "Continue →")}
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
                <strong>{t("18 taong gulang pataas ako", "I am 18 or older")}</strong> {t("at sumasang-ayon sa", "and I agree to the")}{" "}
                <Link href="/terms" className="underline">Terms of Service</Link> {t("at", "and")}{" "}
                <Link href="/privacy" className="underline">Privacy Notice</Link>.
              </span>
            </label>
          </form>
        </Card>
      ) : (
        <Card>
          <form onSubmit={submitOtp} className="space-y-4">
            <p className="text-sm text-gray-700">
              {t("Nagpadala kami ng", "We sent a")} <strong>6-digit code</strong> {t("sa", "to")} <strong>{phone}</strong>. {t("Ilagay dito:", "Enter it here:")}
            </p>
            {devCode && (
              <p className="rounded-xl bg-amber-50 p-3 text-center text-sm text-amber-900">
                {t("Demo lang: walang totoong SMS. Ang code mo ay", "Demo only: no real SMS is sent. Your code is")}{" "}
                <strong className="font-mono text-lg tracking-widest">{devCode}</strong>
              </p>
            )}
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
              {busy ? t("Chine-check…", "Checking…") : t("I-verify", "Verify")}
            </Button>
            <button
              type="button"
              className="w-full text-center text-sm font-semibold text-brand-800 underline"
              onClick={() =>
                fetchJson<{ devCode?: string }>("/api/auth/resend-otp", { method: "POST", body: JSON.stringify({ phone }) })
                  .then((d) => { if (d.devCode) setDevCode(d.devCode); })
                  .catch(() => {})
              }
            >
              {t("Hindi dumating? Magpadala ulit ng code", "Didn't arrive? Resend the code")}
            </button>
          </form>
        </Card>
      )}

      <p className="text-center text-sm text-gray-600">
        {t("May account ka na?", "Already have an account?")} <Link href="/login" className="font-bold text-brand-800 underline">{t("Mag-login", "Log in")}</Link>
      </p>
    </div>
  );
}
