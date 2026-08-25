"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { fetchJson, pesos, timeAgo } from "@/lib/client";
import { Badge, Button, Card, KycBadge, Select, Spinner } from "@/components/ui";
import { REGIONS, citiesOfRegion, getCity } from "@/lib/psgc";

interface Category { id: string; name: string; nameTl: string; icon: string }
interface Alternative { cityCode: string; regionCode: string; count: number }
interface JobRow {
  id: string; title: string; description: string; cityCode: string; regionCode: string;
  budgetCents: number; payType: string; status: string; createdAt: string;
  category: Category;
  client?: { firstName: string; lastInitial: string; kycLevel: number };
}

function JobsFeed() {
  const params = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [jobs, setJobs] = useState<JobRow[] | null>(null);
  const [total, setTotal] = useState(0);
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

  useEffect(() => {
    load(1).catch(() => setJobs([]));
  }, [load]);

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
        <h1 className="whitespace-nowrap text-xl font-extrabold sm:text-2xl">Hanap Trabaho 🔎</h1>
        <Link href="/jobs/new" className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-bold text-white">➕ Post</Link>
      </div>

      {/* Filters */}
      <Card className="space-y-3">
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-4">
          <Select value={region} onChange={(e) => { setRegion(e.target.value); setCity(""); }} className="w-full">
            <option value="">Lahat ng region</option>
            {REGIONS.map((r) => <option key={r.code} value={r.code}>{r.short}</option>)}
          </Select>
          <Select value={city} onChange={(e) => setCity(e.target.value)} disabled={!region}>
            <option value="">Lahat ng city</option>
            {citiesOfRegion(region).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </Select>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Lahat ng kategorya</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.nameTl}</option>)}
          </Select>
          <input
            className="min-h-12 rounded-xl border border-stone-300 px-4 text-base"
            placeholder="Maghanap… (hal. labada)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setSort("recent")}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold ${sort === "recent" ? "bg-brand-700 text-white" : "bg-stone-100 text-gray-600"}`}
          >
            Pinakabago
          </button>
          <button
            onClick={useMyLocation}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold ${sort === "near" ? "bg-brand-700 text-white" : "bg-stone-100 text-gray-600"}`}
          >
            📍 Malapit sa'kin
          </button>
          <span className="ml-auto whitespace-nowrap text-sm text-gray-500">{total} trabaho</span>
        </div>
      </Card>

      {/* Feed */}
      {jobs === null ? (
        <Spinner />
      ) : jobs.length === 0 ? (
        <Card className="space-y-4 py-8 text-center">
          <p className="text-gray-500">Walang trabaho sa filter na &apos;yan — sa ngayon.</p>

          {alternatives.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-800">May trabaho naman dito:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {alternatives.map((a) => (
                  <button
                    key={a.cityCode}
                    onClick={() => { setRegion(a.regionCode); setCity(a.cityCode); }}
                    className="rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-800"
                  >
                    📍 {getCity(a.cityCode)?.name ?? a.cityCode}
                    <span className="ml-1 font-normal text-brand-700">({a.count})</span>
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
                Tanggalin ang filters
              </button>
            )}
            <Link href="/me?tab=provider" className="rounded-full bg-stone-100 px-4 py-2 font-semibold text-gray-700">
              🔔 I-alert ako kapag may bago
            </Link>
            <Link href="/jobs/new" className="rounded-full bg-brand-700 px-4 py-2 font-semibold text-white">
              Mag-post ng trabaho
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
                    <span className="text-3xl">{j.category.icon}</span>
                    <div>
                      <h3 className="font-bold leading-snug">{j.title}</h3>
                      <p className="mt-0.5 line-clamp-2 text-sm text-gray-600">{j.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <Badge tone="brand">{j.category.nameTl}</Badge>
                        <span>📍 {getCity(j.cityCode)?.name ?? j.cityCode}</span>
                        <span>· {timeAgo(j.createdAt)}</span>
                        {j.client && <KycBadge level={j.client.kycLevel} />}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-lg font-extrabold text-brand-800">{pesos(j.budgetCents)}</div>
                    <div className="text-xs text-gray-500">{j.payType === "HOURLY" ? "per hour" : "buong trabaho"}</div>
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

export default function JobsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <JobsFeed />
    </Suspense>
  );
}
