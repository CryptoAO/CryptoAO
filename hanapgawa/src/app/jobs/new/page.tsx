"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchJson } from "@/lib/client";
import { Button, Card, ErrorNote, Field, Input, Select, TextArea } from "@/components/ui";
import { LocationPicker } from "@/components/locationpicker";
import { getCity } from "@/lib/psgc";
import { assessBudget } from "@/lib/pricing";

interface Category { id: string; name: string; nameTl: string; icon: string; minPriceCents: number }
interface Guidance {
  lowCents: number; highCents: number; source: "city" | "nationwide" | "estimate";
  sampleSize: number; note: string | null; minCents: number;
}

const peso = (cents: number) => `₱${Math.round(cents / 100).toLocaleString("en-PH")}`;

function guidanceLine(g: Guidance, cityName: string | null): string {
  const range = `${peso(g.lowCents)}–${peso(g.highCents)}`;
  if (g.source === "city" && cityName) return `Karaniwang bayad sa ${cityName}: ${range}`;
  if (g.source === "nationwide") return `Karaniwang bayad sa buong Pilipinas: ${range}`;
  return `Tantiyang bayad: ${range}`;
}

function NewJobForm() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [regionCode, setRegionCode] = useState("");
  const [cityCode, setCityCode] = useState("");
  const [barangay, setBarangay] = useState("");
  const [addressNote, setAddressNote] = useState("");
  const [payType, setPayType] = useState<"FIXED" | "HOURLY">("FIXED");
  const [budget, setBudget] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [flexible, setFlexible] = useState(true);
  const [inviteProviderId, setInviteProviderId] = useState<string | null>(null);
  const [rebookName, setRebookName] = useState<string | null>(null);

  const [guidance, setGuidance] = useState<Guidance | null>(null);

  const params = useSearchParams();
  const rebookId = params.get("rebook");

  useEffect(() => {
    fetchJson<{ categories: Category[] }>("/api/categories").then((d) => setCategories(d.categories)).catch(() => {});
  }, []);

  // Price guidance follows whatever the client has picked so far. It is
  // advisory only — a failed fetch just means no hint, never a blocked post.
  useEffect(() => {
    if (!categoryId) { setGuidance(null); return; }
    const qs = new URLSearchParams({ categoryId, ...(cityCode ? { cityCode } : {}) });
    let stale = false;
    fetchJson<{ guidance: Guidance | null }>(`/api/pricing?${qs}`)
      .then((d) => { if (!stale) setGuidance(d.guidance); })
      .catch(() => { if (!stale) setGuidance(null); });
    return () => { stale = true; };
  }, [categoryId, cityCode]);

  // Rebooking: prefill from the previous job and route the new post
  // straight to the same provider.
  useEffect(() => {
    if (!rebookId) return;
    fetchJson<{ job: {
      categoryId: string; title: string; description: string; regionCode: string; cityCode: string;
      barangay?: string | null; addressNote?: string | null; payType: string;
      agreedPriceCents?: number | null; budgetCents: number;
      assignedProviderId?: string | null; provider?: { firstName: string } | null;
    } }>(`/api/jobs/${rebookId}`)
      .then((d) => {
        const j = d.job;
        setCategoryId(j.categoryId);
        setTitle(j.title);
        setDescription(j.description);
        setRegionCode(j.regionCode);
        setCityCode(j.cityCode);
        if (j.barangay) setBarangay(j.barangay);
        if (j.addressNote) setAddressNote(j.addressNote);
        setPayType(j.payType === "HOURLY" ? "HOURLY" : "FIXED");
        setBudget(String((j.agreedPriceCents ?? j.budgetCents) / 100));
        if (j.assignedProviderId) setInviteProviderId(j.assignedProviderId);
        if (j.provider?.firstName) setRebookName(j.provider.firstName);
      })
      .catch(() => {});
  }, [rebookId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        categoryId, title, description, regionCode, cityCode,
        barangay: barangay || undefined,
        addressNote: addressNote || undefined,
        payType,
        budgetPhp: Number(budget),
        flexible,
      };
      if (inviteProviderId) body.inviteProviderId = inviteProviderId;
      if (scheduledAt) body.scheduledAt = new Date(scheduledAt).toISOString();
      const d = await fetchJson<{ job: { id: string } }>("/api/jobs", { method: "POST", body: JSON.stringify(body) });
      router.push(`/jobs/${d.job.id}`);
    } catch (err) {
      const msg = (err as Error & { status?: number }).message;
      setError(msg);
      if ((err as { status?: number }).status === 401) router.push("/login");
    } finally {
      setBusy(false);
    }
  }

  const selected = categories.find((c) => c.id === categoryId);
  const budgetCents = Math.round(Number(budget) * 100);
  const verdict = guidance && budgetCents > 0 ? assessBudget(budgetCents, guidance) : null;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-extrabold">Mag-post ng kailangan ➕</h1>
      {rebookName && (
        <div className="rounded-xl bg-brand-50 p-3 text-sm text-brand-900">
          🔁 Ino-book mo ulit si <strong>{rebookName}</strong>. Ide-derecho namin sa kanya ang post na
          ito — pwede pa ring mag-offer ang iba.
        </div>
      )}
      <p className="text-sm text-gray-600">
        Libre mag-post. Magbabayad ka lang kapag tapos na ang trabaho — at protektado ng escrow ang pera mo.
      </p>
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Anong klaseng trabaho?">
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
              <option value="">Piliin ang kategorya…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.nameTl} ({c.name})</option>
              ))}
            </Select>
          </Field>
          <Field label="Maikling title" hint='Hal. "Labada + plantsa, 2 bags, kunin sa bahay"'>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={5} maxLength={90} />
          </Field>
          <Field label="Detalye" hint="Ano ang gagawin, gaano kalaki/karami, ano ang dapat dalhin.">
            <TextArea value={description} onChange={(e) => setDescription(e.target.value)} required minLength={10} maxLength={3000} />
          </Field>
          <LocationPicker regionCode={regionCode} cityCode={cityCode} onChange={(r, c) => { setRegionCode(r); setCityCode(c); }} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Barangay (optional)">
              <Input value={barangay} onChange={(e) => setBarangay(e.target.value)} maxLength={80} />
            </Field>
            <Field label="Kailan? (optional)">
              <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </Field>
          </div>
          <Field
            label="Exact na address / landmark (optional)"
            hint="🔒 PRIVATE ito — makikita lang ng provider na na-book mo, hindi ng publiko."
          >
            <Input value={addressNote} onChange={(e) => setAddressNote(e.target.value)} maxLength={300} placeholder="Blk 5 Lot 3, tapat ng sari-sari store ni Aling Nena" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Klase ng bayad">
              <Select value={payType} onChange={(e) => setPayType(e.target.value as "FIXED" | "HOURLY")}>
                <option value="FIXED">Buong trabaho (fixed)</option>
                <option value="HOURLY">Per hour</option>
              </Select>
            </Field>
            <Field label={`Budget (₱)${selected ? ` — min ₱${selected.minPriceCents / 100}` : ""}`}>
              <Input
                type="number"
                inputMode="decimal"
                min={selected ? selected.minPriceCents / 100 : 50}
                step="1"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                required
                placeholder="500"
              />
            </Field>
          </div>
          {guidance && (
            <div className="rounded-xl bg-stone-100 p-3 text-sm">
              <p className="font-semibold text-gray-800">
                💡 {guidanceLine(guidance, cityCode ? getCity(cityCode)?.name ?? null : null)}
                {guidance.note && <span className="font-normal text-gray-600"> ({guidance.note})</span>}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {guidance.source === "estimate"
                  ? "Tantiya lang ito — ikaw pa rin ang magdedesisyon."
                  : `Base sa ${guidance.sampleSize} natapos nang trabaho.`}
              </p>
              {verdict === "LOW" && (
                <p className="mt-2 rounded-lg bg-amber-100 p-2 text-xs text-amber-900">
                  Mababa ito sa karaniwan. Pwede pa rin i-post, pero mas matagal bago may tumanggap —
                  at karaniwang mas kaunti ang pagpipilian mong provider.
                </p>
              )}
              {verdict === "GENEROUS" && (
                <p className="mt-2 rounded-lg bg-emerald-100 p-2 text-xs text-emerald-900">
                  Mas mataas ito sa karaniwan — asahan mong mabilis mapupuno.
                </p>
              )}
            </div>
          )}
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={flexible} onChange={(e) => setFlexible(e.target.checked)} className="h-5 w-5 accent-brand-700" />
            Flexible ang oras — pwedeng pag-usapan
          </label>
          <ErrorNote message={error} />
          <Button type="submit" full disabled={busy || !categoryId || !regionCode || !cityCode}>
            {busy ? "Pino-post…" : "I-post ang trabaho"}
          </Button>
        </form>
      </Card>
    </div>
  );
}


export default function NewJobPage() {
  return (
    <Suspense fallback={<div className="py-10 text-center text-sm text-gray-500">Loading…</div>}>
      <NewJobForm />
    </Suspense>
  );
}
