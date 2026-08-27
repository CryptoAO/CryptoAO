"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchJson } from "@/lib/client";
import { Button, Card, DateTimeInput, ErrorNote, Field, Input, Select, TextArea } from "@/components/ui";
import { LocationPicker } from "@/components/locationpicker";
import { getCity } from "@/lib/psgc";
import { assessBudget } from "@/lib/pricing";
import { catName, useLang, useT } from "@/lib/i18n";
import { IconInfo, IconLock, IconRepeat, IconSend } from "@/components/icons";

interface Category { id: string; name: string; nameTl: string; icon: string; minPriceCents: number }
interface Guidance {
  lowCents: number; highCents: number; source: "city" | "nationwide" | "estimate";
  sampleSize: number; note: string | null; minCents: number;
}

const peso = (cents: number) => `₱${Math.round(cents / 100).toLocaleString("en-PH")}`;

function NewJobForm() {
  const router = useRouter();
  const t = useT();
  const { lang } = useLang();
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
  const directId = params.get("direct");
  const [directName, setDirectName] = useState<string | null>(null);

  function guidanceLine(g: Guidance, cityName: string | null): string {
    const range = `${peso(g.lowCents)}–${peso(g.highCents)}`;
    if (g.source === "city" && cityName) {
      return t(`Karaniwang bayad sa ${cityName}: ${range}`, `Typical pay in ${cityName}: ${range}`);
    }
    if (g.source === "nationwide") {
      return t(`Karaniwang bayad sa buong Pilipinas: ${range}`, `Typical pay nationwide: ${range}`);
    }
    return t(`Tantiyang bayad: ${range}`, `Estimated pay: ${range}`);
  }

  // Direct mode: this form becomes a private request to one provider.
  useEffect(() => {
    if (!directId) return;
    fetchJson<{ provider: { firstName: string; lastInitial: string; categories: { categoryId: string }[] } }>(
      `/api/providers/${directId}`,
    )
      .then((d) => {
        setDirectName(`${d.provider.firstName} ${d.provider.lastInitial}`);
        // Preselect their first service so the client is not asked to guess.
        if (d.provider.categories[0]) setCategoryId((c) => c || d.provider.categories[0].categoryId);
      })
      .catch(() => {});
  }, [directId]);

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
      if (directId) {
        body.inviteProviderId = directId;
        body.direct = true;
      } else if (inviteProviderId) {
        body.inviteProviderId = inviteProviderId;
      }
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
      <h1 className="text-2xl font-bold">{directName ? t("Direktang booking", "Direct booking") : t("Mag-post ng kailangan", "Post a job")}</h1>
      {directName && (
        <div className="flex items-start gap-2.5 rounded-xl bg-brand-50 p-3 text-sm text-brand-900">
          <span className="mt-0.5 shrink-0 text-brand-700"><IconSend size={16} /></span>
          <span>
            {lang === "en" ? (
              <>Booking request for <strong>{directName}</strong> only — nobody else sees it. If they confirm,
              it's <strong>booked immediately</strong> and payment is held from your wallet. If they don't
              respond within 48 hours, we close the request.</>
            ) : (
              <>Booking request para kay <strong>{directName}</strong> lang — hindi ito makikita ng iba.
              Kapag kinumpirma niya, <strong>booked na agad</strong> at iho-hold ang bayad mula sa wallet mo.
              Kung hindi siya sumagot sa loob ng 48 oras, isasara namin ang request.</>
            )}
          </span>
        </div>
      )}
      {rebookName && !directName && (
        <div className="flex items-start gap-2.5 rounded-xl bg-brand-50 p-3 text-sm text-brand-900">
          <span className="mt-0.5 shrink-0 text-brand-700"><IconRepeat size={16} /></span>
          <span>
            {lang === "en" ? (
              <>You're rebooking <strong>{rebookName}</strong>. We'll send this post straight to them —
              others can still make offers.</>
            ) : (
              <>Ino-book mo ulit si <strong>{rebookName}</strong>. Ide-derecho namin sa kanya ang post na
              ito — pwede pa ring mag-offer ang iba.</>
            )}
          </span>
        </div>
      )}
      <p className="text-sm text-gray-600">
        {t(
          "Libre mag-post. Magbabayad ka lang kapag tapos na ang trabaho — at protektado ng escrow ang pera mo.",
          "Posting is free. You only pay when the work is done — and escrow protects your money.",
        )}
      </p>
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <Field label={t("Anong klaseng trabaho?", "What kind of work?")}>
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
              <option value="">{t("Piliin ang kategorya…", "Choose a category…")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {catName(lang, c)}</option>
              ))}
            </Select>
          </Field>
          <Field
            label={t("Maikling title", "Short title")}
            hint={t('Hal. "Labada + plantsa, 2 bags, kunin sa bahay"', 'E.g. "Laundry + ironing, 2 bags, home pickup"')}
          >
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={5} maxLength={90} />
          </Field>
          <Field
            label={t("Detalye", "Details")}
            hint={t("Ano ang gagawin, gaano kalaki/karami, ano ang dapat dalhin.", "What needs doing, how big or how much, what to bring.")}
          >
            <TextArea value={description} onChange={(e) => setDescription(e.target.value)} required minLength={10} maxLength={3000} />
          </Field>
          <LocationPicker regionCode={regionCode} cityCode={cityCode} onChange={(r, c) => { setRegionCode(r); setCityCode(c); }} />
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("Barangay (optional)", "Barangay (optional)")}>
              <Input value={barangay} onChange={(e) => setBarangay(e.target.value)} maxLength={80} />
            </Field>
            <Field label={t("Kailan? (optional)", "When? (optional)")}>
              <DateTimeInput value={scheduledAt} onChange={setScheduledAt} />
            </Field>
          </div>
          <Field
            label={t("Exact na address / landmark (optional)", "Exact address / landmark (optional)")}
            hint={t(
              "PRIVATE ito — makikita lang ng provider na na-book mo, hindi ng publiko.",
              "This stays PRIVATE — only the provider you book sees it, never the public.",
            )}
          >
            <Input
              value={addressNote}
              onChange={(e) => setAddressNote(e.target.value)}
              maxLength={300}
              placeholder={t("Blk 5 Lot 3, tapat ng sari-sari store", "Blk 5 Lot 3, across the corner store")}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("Klase ng bayad", "Pay type")}>
              <Select value={payType} onChange={(e) => setPayType(e.target.value as "FIXED" | "HOURLY")}>
                <option value="FIXED">{t("Buong trabaho (fixed)", "Whole job (fixed)")}</option>
                <option value="HOURLY">{t("Per hour", "Per hour")}</option>
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
              <p className="flex items-start gap-2 font-semibold text-gray-800">
                <span className="mt-0.5 shrink-0 text-gray-500"><IconInfo size={16} /></span>
                <span>
                  {guidanceLine(guidance, cityCode ? getCity(cityCode)?.name ?? null : null)}
                  {guidance.note && <span className="font-normal text-gray-600"> ({guidance.note})</span>}
                </span>
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {guidance.source === "estimate"
                  ? t("Tantiya lang ito — ikaw pa rin ang magdedesisyon.", "This is an estimate — the decision is yours.")
                  : t(`Base sa ${guidance.sampleSize} natapos nang trabaho.`, `Based on ${guidance.sampleSize} completed jobs.`)}
              </p>
              {verdict === "LOW" && (
                <p className="mt-2 rounded-lg bg-amber-100 p-2 text-xs text-amber-900">
                  {t(
                    "Mababa ito sa karaniwan. Pwede pa rin i-post, pero mas matagal bago may tumanggap — at karaniwang mas kaunti ang pagpipilian mong provider.",
                    "This is below the going rate. You can still post it, but expect a slower response and fewer providers to choose from.",
                  )}
                </p>
              )}
              {verdict === "GENEROUS" && (
                <p className="mt-2 rounded-lg bg-emerald-100 p-2 text-xs text-emerald-900">
                  {t("Mas mataas ito sa karaniwan — asahan mong mabilis mapupuno.", "This is above the going rate — expect it to fill fast.")}
                </p>
              )}
            </div>
          )}
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={flexible} onChange={(e) => setFlexible(e.target.checked)} className="h-5 w-5 accent-brand-700" />
            {t("Flexible ang oras — pwedeng pag-usapan", "Flexible timing — open to discussion")}
          </label>
          <ErrorNote message={error} />
          <Button type="submit" full disabled={busy || !categoryId || !regionCode || !cityCode}>
            {busy
              ? t("Pino-post…", "Posting…")
              : directName
                ? t("Ipadala ang booking request", "Send booking request")
                : t("I-post ang trabaho", "Post the job")}
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
