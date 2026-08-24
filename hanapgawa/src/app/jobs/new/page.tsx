"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchJson } from "@/lib/client";
import { Button, Card, ErrorNote, Field, Input, Select, TextArea } from "@/components/ui";
import { LocationPicker } from "@/components/locationpicker";

interface Category { id: string; name: string; nameTl: string; icon: string; minPriceCents: number }

export default function NewJobPage() {
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

  useEffect(() => {
    fetchJson<{ categories: Category[] }>("/api/categories").then((d) => setCategories(d.categories)).catch(() => {});
  }, []);

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

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-extrabold">Mag-post ng kailangan ➕</h1>
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
