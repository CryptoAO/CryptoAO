"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchJson, pesos } from "@/lib/client";
import { Button, Card, KycBadge, Select, Spinner, Stars } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { REGIONS, citiesOfRegion, getCity } from "@/lib/psgc";

interface Category { id: string; name: string; nameTl: string; icon: string }
interface ProviderRow {
  photoUrl?: string | null;
  id: string; firstName: string; lastInitial: string; cityCode: string; kycLevel: number;
  ratingAvg: number | null; ratingCount: number;
  categories: { categoryId: string; nameTl: string; icon: string; headline?: string | null; rateCents?: number | null; rateUnit?: string | null }[];
}

const RATE_UNIT: Record<string, string> = { PER_HOUR: "/hr", PER_JOB: "/job", PER_KILO: "/kilo", PER_DAY: "/day" };

export default function ProvidersPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [providers, setProviders] = useState<ProviderRow[] | null>(null);
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [needAt, setNeedAt] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchJson<{ categories: Category[] }>("/api/categories").then((d) => setCategories(d.categories)).catch(() => {});
  }, []);

  const load = useCallback(async (p: number) => {
    setProviders(null);
    const sp = new URLSearchParams();
    if (region) sp.set("region", region);
    if (city) sp.set("city", city);
    if (category) sp.set("category", category);
    if (needAt) sp.set("at", new Date(needAt).toISOString());
    sp.set("page", String(p));
    const d = await fetchJson<{ providers: ProviderRow[]; total: number }>(`/api/providers?${sp}`);
    setProviders(d.providers);
    setTotal(d.total);
    setPage(p);
  }, [region, city, category, needAt]);

  useEffect(() => {
    load(1).catch(() => setProviders([]));
  }, [load]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold sm:text-2xl">Mga Service Provider 🧰</h1>
      <Card>
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3">
          <Select value={region} onChange={(e) => { setRegion(e.target.value); setCity(""); }}>
            <option value="">Lahat ng region</option>
            {REGIONS.map((r) => <option key={r.code} value={r.code}>{r.short}</option>)}
          </Select>
          <Select value={city} onChange={(e) => setCity(e.target.value)} disabled={!region}>
            <option value="">Lahat ng city</option>
            {citiesOfRegion(region).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </Select>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Lahat ng serbisyo</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.nameTl}</option>)}
          </Select>
        </div>
        <div className="mt-3">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-gray-800">🗓️ Kailan mo kailangan? (optional)</span>
            <input
              type="datetime-local"
              value={needAt}
              onChange={(e) => setNeedAt(e.target.value)}
              className="w-full min-h-12 rounded-xl border border-stone-300 bg-white px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
            <span className="mt-1 block text-xs text-gray-500">
              {needAt
                ? "Ipinapakita lang ang mga bakante sa oras na iyan — walang ibang booking at pasok sa kanilang oras."
                : "Piliin ang oras para makita kung sino ang bakante noon."}
            </span>
          </label>
        </div>
      </Card>

      {providers === null ? (
        <Spinner />
      ) : providers.length === 0 ? (
        <Card className="py-10 text-center text-gray-500">Wala pang provider dito. Ikaw kaya ang mauna? 😉</Card>
      ) : (
        <>
        <div className="grid gap-3 sm:grid-cols-2">
          {providers.map((p) => (
            <Link key={p.id} href={`/providers/${p.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar photoUrl={p.photoUrl} firstName={p.firstName} lastInitial={p.lastInitial} size={40} />
                    <h3 className="truncate font-bold">{p.firstName} {p.lastInitial}</h3>
                  </div>
                  <KycBadge level={p.kycLevel} />
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                  <Stars value={p.ratingAvg} />
                  {p.ratingCount > 0 && <span>({p.ratingCount})</span>}
                  <span>· 📍 {getCity(p.cityCode)?.name ?? p.cityCode}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.categories.map((c) => (
                    <span key={c.categoryId} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">
                      {c.icon} {c.nameTl}
                      {c.rateCents ? ` · ${pesos(c.rateCents)}${c.rateUnit ? RATE_UNIT[c.rateUnit] ?? "" : ""}` : ""}
                    </span>
                  ))}
                </div>
              </Card>
            </Link>
          ))}
        </div>
        {total > 20 && (
          <div className="flex justify-center gap-2">
            <Button variant="secondary" disabled={page <= 1} onClick={() => load(page - 1)}>← Prev</Button>
            <Button variant="secondary" disabled={page * 20 >= total} onClick={() => load(page + 1)}>Next →</Button>
          </div>
        )}
        </>
      )}
    </div>
  );
}
