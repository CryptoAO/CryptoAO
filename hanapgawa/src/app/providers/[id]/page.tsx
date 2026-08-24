"use client";

import { use, useEffect, useState } from "react";
import { fetchJson, pesos, timeAgo } from "@/lib/client";
import { Card, ErrorNote, KycBadge, Spinner, Stars } from "@/components/ui";
import { getCity, getRegion } from "@/lib/psgc";

interface ProviderDetail {
  id: string; firstName: string; lastInitial: string; bio?: string | null;
  cityCode: string; regionCode: string; kycLevel: number; memberSince: string;
  completedJobs: number; ratingAvg: number | null; ratingCount: number;
  categories: { categoryId: string; name: string; nameTl: string; icon: string; headline?: string | null; rateCents?: number | null; rateUnit?: string | null; yearsExp?: number | null }[];
  availability: { weekday: number; startMin: number; endMin: number }[];
}
interface ReviewRow { id: string; rating: number; comment?: string | null; createdAt: string; rater: { firstName: string; lastInitial: string } }

const DAYS = ["Linggo", "Lunes", "Martes", "Miyerkules", "Huwebes", "Biyernes", "Sabado"];
const RATE_UNIT: Record<string, string> = { PER_HOUR: "/hr", PER_JOB: "/job", PER_KILO: "/kilo", PER_DAY: "/day" };

function fmtMin(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default function ProviderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<{ provider: ProviderDetail; reviews: ReviewRow[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<{ provider: ProviderDetail; reviews: ReviewRow[] }>(`/api/providers/${id}`)
      .then(setData)
      .catch((e) => setError((e as Error).message));
  }, [id]);

  if (error) return <ErrorNote message={error} />;
  if (!data) return <Spinner />;
  const { provider: p, reviews } = data;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-extrabold">{p.firstName} {p.lastInitial}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <Stars value={p.ratingAvg} />
              {p.ratingCount > 0 && <span>({p.ratingCount} reviews)</span>}
              <span>· 📍 {getCity(p.cityCode)?.name}, {getRegion(p.regionCode)?.short}</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <KycBadge level={p.kycLevel} />
              <span className="text-xs text-gray-500">Member since {new Date(p.memberSince).toLocaleDateString("en-PH", { month: "short", year: "numeric" })}</span>
            </div>
          </div>
          <div className="rounded-2xl bg-brand-50 px-4 py-3 text-center">
            <div className="text-2xl font-extrabold text-brand-800">{p.completedJobs}</div>
            <div className="text-xs text-brand-900">tapos na trabaho</div>
          </div>
        </div>
        {p.bio && <p className="mt-4 text-sm text-gray-700">{p.bio}</p>}
      </Card>

      <Card>
        <h2 className="font-bold">Mga serbisyo</h2>
        <div className="mt-3 space-y-2">
          {p.categories.map((c) => (
            <div key={c.categoryId} className="flex items-center justify-between rounded-xl bg-stone-50 p-3">
              <div>
                <div className="text-sm font-bold">{c.icon} {c.nameTl} <span className="font-normal text-gray-500">({c.name})</span></div>
                {c.headline && <div className="text-xs text-gray-600">{c.headline}</div>}
                {c.yearsExp != null && c.yearsExp > 0 && <div className="text-xs text-gray-500">{c.yearsExp} yrs experience</div>}
              </div>
              {c.rateCents && (
                <div className="text-sm font-extrabold text-brand-800">
                  {pesos(c.rateCents)}<span className="text-xs font-normal">{c.rateUnit ? RATE_UNIT[c.rateUnit] : ""}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {p.availability.length > 0 && (
        <Card>
          <h2 className="font-bold">🗓️ Kailan available</h2>
          <div className="mt-3 grid gap-1 text-sm">
            {[0, 1, 2, 3, 4, 5, 6].map((d) => {
              const slots = p.availability.filter((a) => a.weekday === d);
              if (slots.length === 0) return null;
              return (
                <div key={d} className="flex justify-between rounded-lg px-3 py-1.5 odd:bg-stone-50">
                  <span className="font-semibold">{DAYS[d]}</span>
                  <span>{slots.map((s) => `${fmtMin(s.startMin)}–${fmtMin(s.endMin)}`).join(", ")}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="font-bold">Mga review</h2>
        {reviews.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">Wala pang review.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-xl border border-stone-100 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold">{r.rater.firstName} {r.rater.lastInitial}</span>
                  <span className="text-amber-500">{"★".repeat(r.rating)}</span>
                </div>
                {r.comment && <p className="mt-1 text-sm text-gray-600">{r.comment}</p>}
                <div className="mt-1 text-xs text-gray-400">{timeAgo(r.createdAt)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
