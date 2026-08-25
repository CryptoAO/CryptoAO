"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AvatarUploader } from "@/components/avatar";
import { PrivacyControls } from "@/components/privacy-controls";
import { ReadinessCard } from "@/components/readiness";
import { fetchJson, pesos, timeAgo } from "@/lib/client";
import { Badge, Button, Card, ErrorNote, Field, Input, KycBadge, Select, Spinner, TextArea } from "@/components/ui";
import { TrustedContacts } from "@/components/safety";

interface Me {
  user: {
    id: string; firstName: string; lastName: string; phone: string; kycLevel: number;
    isProvider: boolean; isAdmin: boolean; bio?: string | null; photoUrl?: string | null;
    strikeCount: number; status: string;
  } | null;
  balanceCents: number;
}
interface Category { id: string; name: string; nameTl: string; icon: string }

const DAYS = ["Lin", "Lun", "Mar", "Miy", "Huw", "Biy", "Sab"];

function MeDashboard() {
  const router = useRouter();
  const params = useSearchParams();
  const [me, setMe] = useState<Me | null>(null);
  const [tab, setTab] = useState(params.get("tab") ?? "activity");
  // Bumped on every profile save so the readiness checklist re-reads
  // instead of showing a step the provider has just completed.
  const [revision, setRevision] = useState(0);

  const load = useCallback(async () => {
    const d = await fetchJson<Me>("/api/me");
    if (!d.user) {
      router.push("/login");
      return;
    }
    setMe(d);
    setRevision((n) => n + 1);
  }, [router]);

  useEffect(() => {
    load().catch(() => router.push("/login"));
  }, [load]);

  if (!me?.user) return <Spinner />;
  const u = me.user;

  const tabs = [
    { id: "activity", label: "Aktibidad" },
    { id: "wallet", label: "Wallet" },
    { id: "provider", label: "Provider" },
    { id: "kyc", label: "Verification" },
    { id: "safety", label: "Kaligtasan" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">{u.firstName} {u.lastName}</h1>
          <div className="mt-1 flex items-center gap-2">
            <KycBadge level={u.kycLevel} />
            {u.isProvider && <Badge tone="brand">Provider</Badge>}
            {u.status === "FLAGGED" && <Badge tone="red">Under review</Badge>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Wallet</div>
          <div className="text-xl font-extrabold text-brand-800">{pesos(me.balanceCents)}</div>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-2xl bg-stone-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold ${tab === t.id ? "bg-white text-brand-800 shadow-sm" : "text-gray-500"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {u.isProvider && <ReadinessCard key={revision} onGoToTab={setTab} />}

      {tab === "activity" && <ActivityTab meId={u.id} />}
      {tab === "wallet" && <WalletTab onChange={load} />}
      {tab === "provider" && <ProviderTab meId={u.id} isProvider={u.isProvider} bio={u.bio ?? ""} photoUrl={u.photoUrl} firstName={u.firstName} onSaved={load} />}
      {tab === "kyc" && <KycTab kycLevel={u.kycLevel} />}
      {tab === "safety" && <TrustedContacts />}

      <PrivacyControls />

      <div className="pt-2 text-center">
        <button
          className="text-sm font-semibold text-gray-500 underline"
          onClick={async () => {
            await fetchJson("/api/auth/logout", { method: "POST" }).catch(() => {});
            router.push("/");
            router.refresh();
          }}
        >
          Mag-logout
        </button>
      </div>
    </div>
  );
}

/* ---------------- Activity ---------------- */

interface ActivityData {
  jobsPosted: { id: string; title: string; status: string; budgetCents: number; pendingOffers: number; categoryIcon: string; createdAt: string }[];
  offersMade: { id: string; status: string; priceCents: number; job: { id: string; title: string; status: string; categoryIcon: string } }[];
  jobsAssigned: { id: string; title: string; status: string; agreedPriceCents?: number | null; categoryIcon: string }[];
}

function ActivityTab({ meId }: { meId: string }) {
  void meId;
  const [data, setData] = useState<ActivityData | null>(null);
  useEffect(() => {
    fetchJson<ActivityData>("/api/my/activity").then(setData).catch(() => {});
  }, []);
  if (!data) return <Spinner />;

  const empty = data.jobsPosted.length === 0 && data.offersMade.length === 0 && data.jobsAssigned.length === 0;
  return (
    <div className="space-y-4">
      {empty && (
        <Card className="py-8 text-center text-sm text-gray-500">
          Wala ka pang aktibidad. <Link href="/jobs" className="font-bold text-brand-800 underline">Maghanap ng trabaho</Link> o{" "}
          <Link href="/jobs/new" className="font-bold text-brand-800 underline">mag-post ng kailangan mo</Link>.
        </Card>
      )}
      {data.jobsAssigned.length > 0 && (
        <Card>
          <h2 className="font-bold">Mga trabaho ko (provider)</h2>
          <div className="mt-2 space-y-2">
            {data.jobsAssigned.map((j) => (
              <Link key={j.id} href={`/jobs/${j.id}`} className="flex items-center justify-between rounded-xl bg-stone-50 p-3 text-sm hover:bg-brand-50">
                <span>{j.categoryIcon} {j.title}</span>
                <span className="flex items-center gap-2">
                  {j.agreedPriceCents != null && <strong>{pesos(j.agreedPriceCents)}</strong>}
                  <Badge tone={j.status === "COMPLETED" ? "green" : "amber"}>{j.status}</Badge>
                </span>
              </Link>
            ))}
          </div>
        </Card>
      )}
      {data.jobsPosted.length > 0 && (
        <Card>
          <h2 className="font-bold">Mga post ko (client)</h2>
          <div className="mt-2 space-y-2">
            {data.jobsPosted.map((j) => (
              <Link key={j.id} href={`/jobs/${j.id}`} className="flex items-center justify-between rounded-xl bg-stone-50 p-3 text-sm hover:bg-brand-50">
                <span>{j.categoryIcon} {j.title}</span>
                <span className="flex items-center gap-2">
                  {j.pendingOffers > 0 && <Badge tone="amber">{j.pendingOffers} offers</Badge>}
                  <Badge tone={j.status === "OPEN" ? "green" : j.status === "COMPLETED" ? "brand" : "gray"}>{j.status}</Badge>
                </span>
              </Link>
            ))}
          </div>
        </Card>
      )}
      {data.offersMade.length > 0 && (
        <Card>
          <h2 className="font-bold">Mga offer ko</h2>
          <div className="mt-2 space-y-2">
            {data.offersMade.map((o) => (
              <Link key={o.id} href={`/jobs/${o.job.id}`} className="flex items-center justify-between rounded-xl bg-stone-50 p-3 text-sm hover:bg-brand-50">
                <span>{o.job.categoryIcon} {o.job.title}</span>
                <span className="flex items-center gap-2">
                  <strong>{pesos(o.priceCents)}</strong>
                  <Badge tone={o.status === "ACCEPTED" ? "green" : o.status === "PENDING" ? "amber" : "gray"}>{o.status}</Badge>
                </span>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ---------------- Wallet ---------------- */

interface WalletData {
  balanceCents: number;
  entries: { id: string; type: string; amountCents: number; note?: string | null; createdAt: string }[];
  payouts: { id: string; amountCents: number; channel: string; status: string; createdAt: string }[];
}

const LEDGER_LABEL: Record<string, string> = {
  TOPUP: "Cash in",
  ESCROW_HOLD: "Hold para sa booking",
  ESCROW_RELEASE_PAYOUT: "Bayad sa trabaho 🎉",
  ESCROW_REFUND: "Refund",
  PAYOUT_CASHOUT: "Cash out",
  ADJUSTMENT: "Adjustment",
};

function WalletTab({ onChange }: { onChange: () => void }) {
  const [data, setData] = useState<WalletData | null>(null);
  const [amount, setAmount] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [channel, setChannel] = useState("GCASH");
  const [accountRef, setAccountRef] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => fetchJson<WalletData>("/api/wallet").then(setData).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  if (!data) return <Spinner />;

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="text-sm text-gray-500">Balanse</div>
        <div className="text-3xl font-extrabold text-brand-800">{pesos(data.balanceCents)}</div>
        <ErrorNote message={error} />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-stone-50 p-3">
            <h3 className="text-sm font-bold">💵 Cash in (GCash/Maya)</h3>
            <div className="mt-2 flex gap-2">
              <Input type="number" inputMode="decimal" min={50} placeholder="500" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <Button
                disabled={busy || !amount}
                onClick={() => run(() => fetchJson("/api/wallet/topup", { method: "POST", body: JSON.stringify({ amountPhp: Number(amount) }) }))}
                className="min-h-11 shrink-0 px-4 py-2"
              >
                Cash in
              </Button>
            </div>
            <p className="mt-1 text-xs text-gray-500">Demo mode: instant credit. Production: GCash/Maya via PayMongo.</p>
          </div>
          <div className="rounded-xl bg-stone-50 p-3">
            <h3 className="text-sm font-bold">🏧 Cash out</h3>
            <div className="mt-2 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" inputMode="decimal" min={100} placeholder="1000" value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} />
                <Select value={channel} onChange={(e) => setChannel(e.target.value)}>
                  <option value="GCASH">GCash</option>
                  <option value="MAYA">Maya</option>
                  <option value="BANK">Bank</option>
                </Select>
              </div>
              <Input placeholder="GCash number / account" value={accountRef} onChange={(e) => setAccountRef(e.target.value)} />
              <Button
                variant="secondary"
                disabled={busy || !payoutAmount || !accountRef}
                onClick={() => run(() => fetchJson("/api/wallet/payout", { method: "POST", body: JSON.stringify({ amountPhp: Number(payoutAmount), channel, accountRef }) }))}
                full
                className="min-h-11 py-2"
              >
                Request cash out
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-bold">History</h2>
        <div className="mt-2 space-y-1">
          {data.entries.length === 0 && <p className="text-sm text-gray-500">Wala pang transaksyon.</p>}
          {data.entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm odd:bg-stone-50">
              <div>
                <div className="font-semibold">{LEDGER_LABEL[e.type] ?? e.type}</div>
                <div className="text-xs text-gray-400">{timeAgo(e.createdAt)}{e.note ? ` · ${e.note}` : ""}</div>
              </div>
              <div className={`font-extrabold ${e.amountCents >= 0 ? "text-emerald-700" : "text-gray-700"}`}>
                {e.amountCents >= 0 ? "+" : ""}{pesos(e.amountCents)}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ---------------- Provider setup ---------------- */

interface CatRow { categoryId: string; headline?: string; ratePhp?: number; rateUnit?: "PER_HOUR" | "PER_JOB" | "PER_KILO" | "PER_DAY"; yearsExp?: number }

function ProviderTab({ meId, isProvider, bio: initialBio, photoUrl, firstName, onSaved }: { meId: string; isProvider: boolean; bio: string; photoUrl?: string | null; firstName: string; onSaved: () => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [bio, setBio] = useState(initialBio);
  const [rows, setRows] = useState<CatRow[]>([]);
  const [avail, setAvail] = useState<{ weekday: number; startMin: number; endMin: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(!isProvider);

  useEffect(() => {
    fetchJson<{ categories: Category[] }>("/api/categories").then((d) => setCategories(d.categories)).catch(() => {});
  }, []);

  // Prefill the form with the existing profile — otherwise saving would
  // silently wipe categories/availability the provider set up before.
  useEffect(() => {
    if (!isProvider) return;
    fetchJson<{ provider: {
      categories: { categoryId: string; headline?: string | null; rateCents?: number | null; rateUnit?: string | null; yearsExp?: number | null }[];
      availability: { weekday: number; startMin: number; endMin: number }[];
    } }>(`/api/providers/${meId}`)
      .then((d) => {
        setRows(d.provider.categories.map((c) => ({
          categoryId: c.categoryId,
          headline: c.headline ?? undefined,
          ratePhp: c.rateCents != null ? c.rateCents / 100 : undefined,
          rateUnit: (c.rateUnit ?? undefined) as CatRow["rateUnit"],
          yearsExp: c.yearsExp ?? undefined,
        })));
        setAvail(d.provider.availability);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [isProvider, meId]);

  if (!loaded) return <Spinner />;

  function toggleCategory(id: string) {
    setRows((r) => (r.some((x) => x.categoryId === id) ? r.filter((x) => x.categoryId !== id) : [...r, { categoryId: id }]));
  }

  function toggleDay(weekday: number) {
    setAvail((a) =>
      a.some((s) => s.weekday === weekday)
        ? a.filter((s) => s.weekday !== weekday)
        : [...a, { weekday, startMin: 8 * 60, endMin: 17 * 60 }],
    );
  }

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await fetchJson("/api/provider/profile", {
        method: "POST",
        body: JSON.stringify({ bio: bio || undefined, categories: rows, availability: avail }),
      });
      setSaved(true);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-4">
      {isProvider && <JobAlertToggle />}

      <div>
        <h2 className="font-bold">{isProvider ? "I-update ang provider profile mo" : "Maging provider — kumita na! 💪"}</h2>
        <p className="mt-1 text-sm text-gray-600">
          Piliin ang mga kaya mong serbisyo, lagyan ng presyo, at sabihin kung kailan ka available.
        </p>
      </div>

      <AvatarUploader photoUrl={photoUrl} firstName={firstName} onChange={onSaved} />

      <Field label="Maikling intro tungkol sa'yo">
        <TextArea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={1000} placeholder="Hal. 10 taon na akong labandera, maingat sa damit, may sariling plantsa…" />
      </Field>

      <div>
        <span className="mb-2 block text-sm font-semibold">Mga serbisyo (piliin lahat ng kaya mo)</span>
        <div className="grid grid-cols-2 gap-2">
          {categories.map((c) => {
            const active = rows.some((r) => r.categoryId === c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCategory(c.id)}
                className={`rounded-xl border-2 p-3 text-left text-sm font-semibold ${active ? "border-brand-700 bg-brand-50 text-brand-900" : "border-stone-200 bg-white text-gray-600"}`}
              >
                {c.icon} {c.nameTl}
              </button>
            );
          })}
        </div>
      </div>

      {rows.map((r) => {
        const c = categories.find((x) => x.id === r.categoryId);
        return (
          <div key={r.categoryId} className="rounded-xl bg-stone-50 p-3">
            <div className="text-sm font-bold">{c?.icon} {c?.nameTl} — presyo mo</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Input
                type="number" inputMode="decimal" placeholder="₱ rate"
                value={r.ratePhp ?? ""}
                onChange={(e) => setRows((rs) => rs.map((x) => x.categoryId === r.categoryId ? { ...x, ratePhp: e.target.value ? Number(e.target.value) : undefined } : x))}
              />
              <Select
                value={r.rateUnit ?? ""}
                onChange={(e) => setRows((rs) => rs.map((x) => x.categoryId === r.categoryId ? { ...x, rateUnit: (e.target.value || undefined) as CatRow["rateUnit"] } : x))}
              >
                <option value="">Per ano?</option>
                <option value="PER_HOUR">Per hour</option>
                <option value="PER_JOB">Per job</option>
                <option value="PER_KILO">Per kilo</option>
                <option value="PER_DAY">Per day</option>
              </Select>
            </div>
          </div>
        );
      })}

      <div>
        <span className="mb-2 block text-sm font-semibold">Kailan ka available? (8AM–5PM default, tap para i-toggle)</span>
        <div className="flex gap-1.5">
          {DAYS.map((d, i) => {
            const active = avail.some((s) => s.weekday === i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggleDay(i)}
                className={`h-11 flex-1 rounded-xl text-sm font-bold ${active ? "bg-brand-700 text-white" : "bg-stone-100 text-gray-500"}`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      <ErrorNote message={error} />
      {saved && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">Na-save! Makikita ka na sa provider list. 🎉</div>}
      <Button full disabled={busy || rows.length === 0} onClick={save}>
        {busy ? "Sine-save…" : "I-save ang provider profile"}
      </Button>
    </Card>
  );
}

function JobAlertToggle() {
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchJson<{ user: { notifyNewJobs?: boolean } | null }>("/api/me")
      .then((d) => setOn(d.user?.notifyNewJobs ?? true))
      .catch(() => setOn(true));
  }, []);

  if (on === null) return null;

  async function toggle() {
    const next = !on;
    setOn(next);
    setBusy(true);
    try {
      await fetchJson("/api/me", { method: "POST", body: JSON.stringify({ notifyNewJobs: next }) });
    } catch {
      setOn(!next); // put it back if the save failed
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="flex items-start gap-3 rounded-xl bg-brand-50 p-3">
      <input
        type="checkbox"
        checked={on}
        onChange={toggle}
        disabled={busy}
        className="mt-1 h-5 w-5 accent-brand-700"
      />
      <span className="text-sm">
        <strong>Abisuhan ako ng bagong trabaho sa lugar ko.</strong> Ito ang pinakamabilis na paraan
        para makakuha ng raket — unahan ang mag-offer.
      </span>
    </label>
  );
}

/* ---------------- KYC ---------------- */

interface KycData { kycLevel: number; submissions: { id: string; level: number; docType: string; status: string; hasDocument: boolean; createdAt: string }[] }

function KycTab({ kycLevel }: { kycLevel: number }) {
  const [data, setData] = useState<KycData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [docType, setDocType] = useState("PHILSYS");
  const [idLastFour, setIdLastFour] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(
    () => fetchJson<KycData>("/api/kyc").then(setData).catch((e) => setLoadError((e as Error).message)),
    [],
  );
  useEffect(() => { load(); }, [load]);

  // Keep the doc dropdown's state in sync with which level is being applied
  // for — otherwise a Level-3 submit could silently send a Level-2 doc type.
  useEffect(() => {
    if (data) setDocType(data.kycLevel < 2 ? "PHILSYS" : "NBI");
  }, [data]);

  if (loadError && !data) return <ErrorNote message={loadError} />;
  if (!data) return <Spinner />;
  const level = data.kycLevel;
  const nextLevel = level < 2 ? 2 : level < 3 ? 3 : null;
  const pending = data.submissions.some((s) => s.status === "PENDING");

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await fetchJson("/api/kyc", {
        method: "POST",
        body: JSON.stringify({ level: nextLevel, docType, idLastFour: idLastFour || undefined }),
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadDoc(submissionId: string, file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("submissionId", submissionId);
      fd.append("file", file);
      // Not fetchJson: multipart must not carry a JSON Content-Type header.
      const res = await fetch("/api/kyc/upload", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Hindi na-upload ang file");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const pendingSub = data.submissions.find((s) => s.status === "PENDING");

  const steps = [
    { lvl: 1, name: "Phone verified", desc: "OTP sa cellphone mo", icon: "📱" },
    { lvl: 2, name: "ID verified", desc: "PhilSys / Driver's License / UMID / Passport", icon: "🪪" },
    { lvl: 3, name: "Fully vetted", desc: "NBI o Police Clearance", icon: "🛡️" },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="font-bold">Verification ladder</h2>
        <p className="mt-1 text-sm text-gray-600">
          Habang mas verified ka, mas maraming trabaho ang bukas sa'yo — at mas pinagkakatiwalaan ka ng mga client.
          Ang jobs na ₱2,000+ ay para sa ID-verified providers.
        </p>
        <div className="mt-4 space-y-2">
          {steps.map((s) => (
            <div key={s.lvl} className={`flex items-center gap-3 rounded-xl p-3 ${level >= s.lvl ? "bg-emerald-50" : "bg-stone-50"}`}>
              <span className="text-2xl">{s.icon}</span>
              <div className="flex-1">
                <div className="text-sm font-bold">{s.name}</div>
                <div className="text-xs text-gray-500">{s.desc}</div>
              </div>
              {level >= s.lvl ? <Badge tone="green">✔ Done</Badge> : <Badge tone="gray">Level {s.lvl}</Badge>}
            </div>
          ))}
        </div>
      </Card>

      {nextLevel && (
        <Card>
          <h2 className="font-bold">{nextLevel === 2 ? "I-verify ang ID mo (Level 2)" : "Maging Fully Vetted (Level 3)"}</h2>
          {pending ? (
            <div className="mt-3 space-y-3">
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                ⏳ Nire-review pa ng team ang submission mo (karaniwang 1 araw lang).
              </p>
              {pendingSub && (
                <div className="rounded-xl border border-stone-200 p-3">
                  <div className="text-sm font-bold">
                    {pendingSub.hasDocument ? "📎 May naka-attach nang larawan" : "📷 Mag-attach ng larawan ng ID"}
                  </div>
                  <p className="mt-1 text-xs text-gray-600">
                    Kunan ng malinaw na litrato ang ID mo. Nakikita lang ito ng verification team, at
                    binubura namin ito pagkatapos ma-review. JPG/PNG/PDF, hanggang 6MB.
                  </p>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadDoc(pendingSub.id, f);
                      e.target.value = "";
                    }}
                    className="mt-2 block w-full text-sm file:mr-3 file:min-h-11 file:rounded-xl file:border-0 file:bg-brand-700 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white"
                  />
                  {uploading && <p className="mt-2 text-xs text-gray-500">Ina-upload…</p>}
                  {pendingSub.hasDocument && !uploading && (
                    <p className="mt-2 text-xs text-emerald-700">
                      ✔ Na-attach na. Pwede mo pa itong palitan hangga't hindi pa na-review.
                    </p>
                  )}
                </div>
              )}
              <ErrorNote message={error} />
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <Field label="Anong dokumento?">
                <Select value={docType} onChange={(e) => setDocType(e.target.value)}>
                  {nextLevel === 2 ? (
                    <>
                      <option value="PHILSYS">PhilSys National ID</option>
                      <option value="DRIVERS_LICENSE">Driver's License</option>
                      <option value="UMID">UMID</option>
                      <option value="PASSPORT">Passport</option>
                    </>
                  ) : (
                    <>
                      <option value="NBI">NBI Clearance</option>
                      <option value="POLICE">Police Clearance</option>
                    </>
                  )}
                </Select>
              </Field>
              <Field label="Last 4 digits ng ID number" hint="Hindi namin sine-save ang buong numero — last 4 lang, para sa data privacy mo.">
                <Input inputMode="numeric" maxLength={4} value={idLastFour} onChange={(e) => setIdLastFour(e.target.value.replace(/\D/g, ""))} placeholder="1234" />
              </Field>
              <p className="text-xs text-gray-500">
                Sa production: photo upload + selfie check + PSA eVerify. Sa demo: declaration + manual admin review.
              </p>
              <ErrorNote message={error} />
              <Button full disabled={busy || idLastFour.length !== 4} onClick={submit}>I-submit para sa review</Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

export default function MePage() {
  return (
    <Suspense fallback={<Spinner />}>
      <MeDashboard />
    </Suspense>
  );
}
