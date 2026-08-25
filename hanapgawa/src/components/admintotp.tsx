"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/client";
import { Button, Card, ErrorNote, Input } from "@/components/ui";

/**
 * Admin 2FA setup. Lives on the console because it protects the console.
 * The secret is shown exactly once; "enable" proves the authenticator works
 * before 2FA starts gating logins, so an admin cannot lock themselves out
 * with a mistyped secret.
 */
export function AdminTotp() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauth, setOtpauth] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<{ enabled: boolean }>("/api/admin/totp")
      .then((d) => setEnabled(d.enabled))
      .catch(() => setEnabled(null));
  }, []);

  async function act(action: "setup" | "enable" | "disable") {
    setBusy(true);
    setError(null);
    try {
      const d = await fetchJson<{ secret?: string; otpauth?: string; enabled?: boolean }>("/api/admin/totp", {
        method: "POST",
        body: JSON.stringify({ action, code: code || undefined }),
      });
      if (action === "setup") {
        setSecret(d.secret!);
        setOtpauth(d.otpauth!);
      } else {
        setEnabled(!!d.enabled);
        setSecret(null);
        setOtpauth(null);
        setCode("");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (enabled === null) return null;

  return (
    <Card className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-bold">🔐 Two-factor sa admin login</h2>
        <span className={`text-xs font-bold ${enabled ? "text-emerald-700" : "text-red-600"}`}>
          {enabled ? "NAKA-ON" : "NAKA-OFF"}
        </span>
      </div>
      <p className="text-sm text-gray-600">
        Ang console na ito ang susi sa pera at datos ng lahat. Kapag naka-on, kailangan ng 6-digit code
        mula sa authenticator app (Google Authenticator, Aegis, 1Password) tuwing magla-login ka.
      </p>

      {!enabled && !secret && (
        <Button variant="secondary" disabled={busy} onClick={() => act("setup")} className="min-h-10 px-4 py-2 text-sm">
          Simulan ang setup
        </Button>
      )}

      {secret && (
        <div className="space-y-2 rounded-xl bg-stone-50 p-3">
          <p className="text-sm font-semibold">1. Ilagay ang secret na ito sa authenticator app mo:</p>
          <p className="break-all rounded-lg bg-white p-2 font-mono text-sm font-bold tracking-wider">{secret}</p>
          {otpauth && (
            <p className="text-xs text-gray-500">
              O buksan ang{" "}
              <a href={otpauth} className="underline">
                otpauth link
              </a>{" "}
              sa parehong phone. Ipapakita ang secret na ito nang isang beses lang.
            </p>
          )}
          <p className="text-sm font-semibold">2. Ilagay ang code na pinapakita ng app para i-on:</p>
          <div className="flex gap-2">
            <Input
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
              className="w-32 min-h-12 rounded-xl border border-stone-300 px-4 py-3 text-center font-mono"
            />
            <Button disabled={busy || code.length !== 6} onClick={() => act("enable")} className="min-h-10 px-4 py-2 text-sm">
              I-on ang 2FA
            </Button>
          </div>
        </div>
      )}

      {enabled && (
        <div className="flex items-center gap-2">
          <Input
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="Code para i-off"
            className="w-40 min-h-12 rounded-xl border border-stone-300 px-4 py-3 text-center font-mono"
          />
          <Button variant="ghost" disabled={busy || code.length !== 6} onClick={() => act("disable")} className="min-h-10 px-4 py-2 text-sm">
            I-off
          </Button>
        </div>
      )}
      <ErrorNote message={error} />
    </Card>
  );
}
