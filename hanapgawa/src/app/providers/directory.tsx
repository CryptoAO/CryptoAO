"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fetchJson, pesos } from "@/lib/client";
import { Button, Card, DateTimeInput, KycBadge, Select, Spinner, Stars } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { REGIONS, citiesOfRegion, getCity } from "@/lib/psgc";
import { catName, useLang, useT } from "@/lib/i18n";
import { IconMapPin } from "@/components/icons";

interface Category { id: string; name: string; nameTl: string; icon: string }
export interface ProviderRow {
  photoUrl?: string | null;
  id: string; firstName: string; lastInitial: string; cityCode: string; kycLevel: number;
  ratingAvg: number | null; ratingCount: number; completedJobs?: number;
  categories: { categoryId: string; name: string; nameTl: string; icon: string; headline?: string | null; rateCents?: number | null; rateUnit?: string | null }[];
}

const RATE_UNIT: Record<string, string> = { PER_HOUR: "/hr", PER_JOB: "/job", PER_KILO: "/kilo", PER_DAY: "/day" };

export interface ProvidersInitial { providers: ProviderRow[]; total: number }

export default function ProvidersDirectory({ initial }: { initial: ProvidersInitial }) {
  const t = useT();
  const { lang } = useLang();
  const [categories, setCategories] = useState<Category[]>([]);
  const [providers, setProviders] = useState<ProviderRow[] | null>(initial.providers);
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [needAt, setNeedAt] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initial.total);

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

  const hydrated = useRef(false);
  useEffect(() => {
    // First page is server-rendered; fetch only when filters change.
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    load(1).catch(() => setProviders([]));
  }, [load]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold sm:text-2xl">{t("Mga Service Provider", "Service Providers")}</h1>
      <Card>
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3">
          <Select aria-label={t("Region", "Region")} value={region} onChange={(e) => { setRegion(e.target.value); setCity(""); }}>
            <option value="">{t("Lahat ng region", "All regions")}</option>
            {REGIONS.map((r) => <option key={r.code} value={r.code}>{r.short}</option>)}
          </Select>
          <Select aria-label={t("City", "City")} value={city} onChange={(e) => setCity(e.target.value)} disabled={!region}>
            <option value="">{t("Lahat ng city", "All cities")}</option>
            {citiesOfRegion(region).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </Select>
          <Select aria-label={t("Serbisyo", "Service")} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">{t("Lahat ng serbisyo", "All services")}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {catName(lang, c)}</option>)}
          </Select>
        </div>
        <div className="mt-3">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-gray-800">{t("Kailan mo kailangan? (optional)", "When do you need it? (optional)")}</span>
            <DateTimeInput value={needAt} onChange={setNeedAt} />
            <span className="mt-1 block text-xs text-gray-500">
              {needAt
                ? t(
                    "Ipinapakita lang ang mga bakante sa oras na iyan — walang ibang booking at pasok sa kanilang oras.",
                    "Showing only providers free at that time — no clashing booking, and within their stated hours.",
                  )
                : t("Piliin ang oras para makita kung sino ang bakante noon.", "Pick a time to see who's free then.")}
            </span>
          </label>
        </div>
      </Card>

      {providers === null ? (
        <Spinner />
      ) : providers.length === 0 ? (
        <Card className="py-10 text-center text-gray-500">
          {t("Wala pang provider dito. Ikaw kaya ang mauna?", "No providers here yet. Be the first?")}
        </Card>
      ) : (
        <>
        <div className="grid gap-3 sm:grid-cols-2">
          {providers.map((p) => (
            <Link key={p.id} href={`/providers/${p.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar photoUrl={p.photoUrl} firstName={p.firstName} lastInitial={p.lastInitial} size={40} />
                    <h2 className="truncate font-bold">{p.firstName} {p.lastInitial}</h2>
                  </div>
                  <KycBadge level={p.kycLevel} />
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                  <Stars value={p.ratingAvg} emptyLabel={t("Wala pang rating", "No ratings yet")} />
                  {p.ratingCount > 0 && <span>({p.ratingCount})</span>}
                  {(p.completedJobs ?? 0) > 0 && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800">
                      {p.completedJobs} {t("tapos na trabaho", "jobs done")}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">· <IconMapPin size={12} /> {getCity(p.cityCode)?.name ?? p.cityCode}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.categories.map((c) => (
                    <span key={c.categoryId} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">
                      {c.icon} {catName(lang, c)}
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
