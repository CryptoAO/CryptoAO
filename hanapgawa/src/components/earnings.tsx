"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJson, pesos } from "@/lib/client";
import { Button, Card, ErrorNote } from "@/components/ui";
import { useT } from "@/lib/i18n";

interface Statement {
  id: string;
  code: string;
  periodFrom: string;
  periodTo: string;
  totalPayoutCents: number;
  jobsCount: number;
  createdAt: string;
  expiresAt: string;
  active: boolean;
  url: string | null;
}

/**
 * Patunay ng Kita — the provider's side.
 *
 * The pitch in one sentence, because the audience has been burned by
 * paperwork before: gumawa ng code, iabot sa bangko, tapos. The bank does
 * not need an account; they open the link or type the code and see a page
 * that says exactly what this person earned here.
 */
export function EarningsProof() {
  const t = useT();
  const [statements, setStatements] = useState<Statement[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchJson<{ statements: Statement[] }>("/api/me/earnings")
      .then((d) => setStatements(d.statements))
      .catch(() => setStatements([]));
  }, []);
  useEffect(load, [load]);

  async function generate(months: 3 | 6 | 12) {
    setBusy(true);
    setError(null);
    try {
      await fetchJson("/api/me/earnings", { method: "POST", body: JSON.stringify({ months }) });
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setError(null);
    try {
      await fetchJson("/api/me/earnings", { method: "DELETE", body: JSON.stringify({ id }) });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function copy(stmt: Statement) {
    const link = `${location.origin}${stmt.url}`;
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(stmt.id);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  const active = statements?.filter((s) => s.active) ?? [];

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="font-bold">Patunay ng Kita</h2>
        <p className="mt-1 text-sm text-gray-600">
          {t("Gumawa ng opisyal na statement ng kinita mo dito — para sa bangko, sa uupahang bahay, o sa visa. May code itong made-verify nila online, walang kailangang tawagan.", "Generate an official statement of what you earned here — for a bank, a landlord, or a visa. It carries a code they can verify online, no phone calls needed.")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {([3, 6, 12] as const).map((m) => (
          <Button key={m} variant="secondary" disabled={busy} onClick={() => generate(m)} className="min-h-10 px-4 py-2 text-sm">
            {t(`Huling ${m} buwan`, `Last ${m} months`)}
          </Button>
        ))}
      </div>

      {active.length > 0 && (
        <ul className="space-y-2">
          {active.map((s) => (
            <li key={s.id} className="rounded-xl bg-stone-50 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-sm font-bold tracking-wide">{s.code}</span>
                <span className="text-sm font-bold text-brand-800">{pesos(s.totalPayoutCents)}</span>
              </div>
              <div className="mt-0.5 text-xs text-gray-500">
                {s.jobsCount} {t("trabaho", "jobs")} · {t("valid hanggang", "valid until")}{" "}
                {new Date(s.expiresAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
                <a href={s.url!} target="_blank" rel="noreferrer" className="text-brand-800 underline">
                  {t("Tingnan ang statement", "View statement")}
                </a>
                <button onClick={() => copy(s)} className="text-brand-800 underline">
                  {copied === s.id ? t("Na-copy ✓", "Copied ✓") : t("I-copy ang link", "Copy link")}
                </button>
                <button onClick={() => revoke(s.id)} className="text-gray-500 underline">
                  {t("Bawiin", "Revoke")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-gray-500">
        {t("Makikita ng sinumang may hawak ng code ang pangalan mo at kabuuang kinita — iyan mismo ang silbi niya. Ibigay lang sa pinagkakatiwalaan mo, at pwede mo itong bawiin anumang oras.", "Anyone holding the code sees your name and total earnings — that is exactly its purpose. Share it only with people you trust; you can revoke it anytime.")}
      </p>
      <ErrorNote message={error} />
    </Card>
  );
}
