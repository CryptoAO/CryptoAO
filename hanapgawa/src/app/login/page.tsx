"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchJson } from "@/lib/client";
import { Button, Card, ErrorNote, Field, Input } from "@/components/ui";
import { useT } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const t = useT();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, string> = { phone, password };
      if (totpCode) body.totpCode = totpCode;
      await fetchJson("/api/auth/login", { method: "POST", body: JSON.stringify(body) });
      router.push("/jobs");
      router.refresh();
    } catch (err) {
      const msg = (err as Error).message;
      // The server asks for the second factor only after the password
      // verified — reveal the field instead of showing a dead-end error.
      if (msg.includes("authenticator code") && !msg.includes("Mali")) {
        setNeedsTotp(true);
        setError(null);
      } else {
        setError(msg);
        if (msg.includes("authenticator")) setNeedsTotp(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-bold">{t("Mag-login", "Log in")}</h1>
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <Field label={t("Cellphone number", "Mobile number")}>
            <Input type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="09171234567" />
          </Field>
          <Field label="Password">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          {needsTotp && (
            <Field label={t("Authenticator code", "Authenticator code")} hint={t("Ang 6-digit code mula sa authenticator app mo.", "The 6-digit code from your authenticator app.")}>
              <Input
                inputMode="numeric"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                autoFocus
                placeholder="••••••"
              />
            </Field>
          )}
          <ErrorNote message={error} />
          <Button type="submit" full disabled={busy}>
            {busy ? t("Sandali lang…", "One moment…") : "Login"}
          </Button>
          <Link href="/forgot" className="block text-center text-sm font-semibold text-brand-800 underline">
            {t("Nakalimutan ang password?", "Forgot your password?")}
          </Link>
        </form>
      </Card>
      <p className="text-center text-sm text-gray-600">
        {t("Wala ka pang account?", "No account yet?")} <Link href="/register" className="font-bold text-brand-800 underline">{t("Sign up — libre!", "Sign up — it's free!")}</Link>
      </p>
    </div>
  );
}
