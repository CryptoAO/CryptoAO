"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { fetchJson, pesos, timeAgo } from "@/lib/client";
import { Badge, Button, Card, KycBadge, Select, Spinner } from "@/components/ui";
import { REGIONS, citiesOfRegion, getCity } from "@/lib/psgc";
import { catName, useLang, useT } from "@/lib/i18n";
import { IconBell, IconMapPin } from "@/components/icons";

interface Category { id: string; name: string; nameTl: string; icon: string }
interface Alternative { cityCode: string; regionCode: string; count: number }
export interface JobRow {
  id: string; title: string; description: string; cityCode: string; regionCode: string;
  budgetCents: number; payType: string; status: string; createdAt: string;
  category: Category;
  client?: { firstName: string; lastInitial: string; kycLevel: number };
}

export interface JobsInitial { jobs: JobRow[]; total: number }

function JobsFeed({ initial }: { initial: JobsInitial }) {
  const params = useSearchParams();
  const t = useT();
  const { lang } = useLang();
  const [categories, setCategories] = useState<Category[]>([]);
  // Server-rendered first page: real cards in the pre-hydration HTML, no
  // spinner-then-pop, and crawlers see the same jobs the API returns.
  const [jobs, setJobs] = useState<JobRow[] | null>(initial.jobs);
  const [total, setTotal] = useState(initial.total);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [page, setPage] = useState(1);

  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState(params.get("category") ?? "");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"recent" | "near">("recent");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const reqSeq = useRef(0);

  useEffect(() => {
    fetchJson<{ categories: Category[] }>("/api/categories").then((d) => setCategories(d.categories)).catch(() => {});
  }, []);

  const load = useCallback(async (p: number) => {
    setJobs(null);
    const sp = new URLSearchParams();
    if (region) sp.set("region", region);
    if (city) sp.set("city", city);
    if (category) sp.set("category", category);
    if (q) sp.set("q", q);
    sp.set("sort", sort);
    sp.set("page", String(p));
    if (sort === "near" && coords) {
      sp.set("lat", String(coords.lat));
      sp.set("lng", String(coords.lng));
    }
    const seq = ++reqSeq.current;
    const d = await fetchJson<{ jobs: JobRow[]; total: number; alternatives?: Alternative[] }>(`/api/jobs?${sp}`);
    if (seq !== reqSeq.current) return; // a newer request superseded this one
    setJobs(d.jobs);
    setTotal(d.total);
    setAlternatives(d.alternatives ?? []);
    setPage(p);
  }, [region, city, category, q, sort, coords]);

  const hydrated = useRef(false);
  useEffect(() => {
    // The server already rendered the default view; only refetch on mount
    // when a ?category= deep link makes the default view wrong.
    if (!hydrated.current) {
      hydrated.current = true;
      if (!params.get("category")) return;
    }
    load(1).catch(() => setJobs([]));
  }, [load, params]);

  function useMyLocation() {
    setSort("near");
    if (!coords && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}, // fall back to profile city server-side
        { maximumAge: 300_000, timeout: 5_000 },
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="whitespace-nowrap text-xl font-bold sm:text-2xl">{t("Hanap Trabaho", "Find Work")}</h1>
        <Link href="/jobs/new" className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-bold text-white">
          {t("+ Post", "+ Post")}
        </Link>
      </div>

      {/* Filters */}
      <Card className="space-y-3">
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-4">
          <Select aria-label={t("Region", "Region")} value={region} onChange={(e) => { setRegion(e.target.value); setCity(""); }} className="w-full">
            <option value="">{t("Lahat ng region", "All regions")}</option>
            {REGIONS.map((r) => <option key={r.code} value={r.code}>{r.short}</option>)}
          </Select>
          <Select aria-label={t("City", "City")} value={city} onChange={(e) => setCity(e.target.value)} disabled={!region}>
            <option value="">{t("Lahat ng city", "All cities")}</option>
            {citiesOfRegion(region).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </Select>
          <Select aria-label={t("Kategorya", "Category")} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">{t("Lahat ng kategorya", "All categories")}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {catName(lang, c)}</option>)}
          </Select>
          <input
            className="min-h-12 rounded-xl border border-stone-300 px-4 text-base"
            aria-label={t("Maghanap", "Search")}
            placeholder={t("Maghanap… (hal. labada)", "Search… (e.g. laundry)")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setSort("recent")}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold ${sort === "recent" ? "bg-brand-700 text-white" : "bg-stone-100 text-gray-600"}`}
          >
            {t("Pinakabago", "Newest")}
          </button>
          <button
            onClick={useMyLocation}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold ${sort === "near" ? "bg-brand-700 text-white" : "bg-stone-100 text-gray-600"}`}
          >
            <IconMapPin size={14} /> {t("Malapit sa'kin", "Near me")}
          </button>
          <span className="ml-auto whitespace-nowrap text-sm text-gray-500">{jobs === null ? "…" : `${total} ${t("trabaho", "jobs")}`}</span>
        </div>
      </Card>

      {/* Feed */}
      {jobs === null ? (
        <Spinner />
      ) : jobs.length === 0 ? (
        <Card className="space-y-4 py-8 text-center">
          <p className="text-gray-500">{t("Walang trabaho sa filter na 'yan — sa ngayon.", "No jobs match those filters — for now.")}</p>

          {alternatives.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-800">{t("May trabaho naman dito:", "There are jobs here:")}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {alternatives.map((a) => (
                  <button
                    key={a.cityCode}
                    onClick={() => { setRegion(a.regionCode); setCity(a.cityCode); }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-800"
                  >
                    <IconMapPin size={14} /> {getCity(a.cityCode)?.name ?? a.cityCode}
                    <span className="font-normal text-brand-700">({a.count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-2 text-sm">
            {(region || city || category || q) && (
              <button
                onClick={() => { setRegion(""); setCity(""); setCategory(""); setQ(""); }}
                className="rounded-full bg-stone-100 px-4 py-2 font-semibold text-gray-700"
              >
                {t("Tanggalin ang filters", "Clear filters")}
              </button>
            )}
            <Link href="/me?tab=provider" className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-4 py-2 font-semibold text-gray-700">
              <IconBell size={14} /> {t("I-alert ako kapag may bago", "Alert me about new jobs")}
            </Link>
            <Link href="/jobs/new" className="rounded-full bg-brand-700 px-4 py-2 font-semibold text-white">
              {t("Mag-post ng trabaho", "Post a job")}
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((j) => (
            <Link key={j.id} href={`/jobs/${j.id}`} className="block">
              <Card className="transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-stone-100 text-2xl">{j.category.icon}</span>
                    <div>
                      <h2 className="font-bold leading-snug">{j.title}</h2>
                      <p className="mt-0.5 line-clamp-2 text-sm text-gray-600">{j.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <Badge tone="brand">{catName(lang, j.category)}</Badge>
                        <span className="inline-flex items-center gap-1"><IconMapPin size={12} /> {getCity(j.cityCode)?.name ?? j.cityCode}</span>
                        <span>· {timeAgo(j.createdAt)}</span>
                        {j.client && <KycBadge level={j.client.kycLevel} />}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-lg font-bold text-brand-800">{pesos(j.budgetCents)}</div>
                    <div className="text-xs text-gray-500">{j.payType === "HOURLY" ? t("per hour", "per hour") : t("buong trabaho", "whole job")}</div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
          {total > jobs.length && (
            <div className="flex justify-center gap-2">
              <Button variant="secondary" disabled={page <= 1} onClick={() => load(page - 1)}>← Prev</Button>
              <Button variant="secondary" disabled={page * 20 >= total} onClick={() => load(page + 1)}>Next →</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function JobsFeedShell({ initial }: { initial: JobsInitial }) {
  return (
    <Suspense fallback={<Spinner />}>
      <JobsFeed initial={initial} />
    </Suspense>
  );
}
