"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchJson, pesos } from "@/lib/client";
import { Card, KycBadge, Select, Spinner, Stars } from "@/components/ui";
import { REGIONS, citiesOfRegion, getCity } from "@/lib/psgc";

interface Category { id: string; name: string; nameTl: string; icon: string }
interface ProviderRow {
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

  useEffect(() => {
    fetchJson<{ categories: Category[] }>("/api/categories").then((d) => setCategories(d.categories)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setProviders(null);
    const sp = new URLSearchParams();
    if (region) sp.set("region", region);
    if (city) sp.set("city", city);
    if (category) sp.set("category", category);
    const d = await fetchJson<{ providers: ProviderRow[] }>(`/api/providers?${sp}`);
    setProviders(d.providers);
  }, [region, city, category]);

  useEffect(() => {
    load().catch(() => setProviders([]));
  }, [load]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Mga Service Provider 🧰</h1>
      <Card>
        <div className="grid grid-cols-3 gap-3">
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
      </Card>

      {providers === null ? (
        <Spinner />
      ) : providers.length === 0 ? (
        <Card className="py-10 text-center text-gray-500">Wala pang provider dito. Ikaw kaya ang mauna? 😉</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {providers.map((p) => (
            <Link key={p.id} href={`/providers/${p.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">{p.firstName} {p.lastInitial}</h3>
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
      )}
    </div>
  );
}
