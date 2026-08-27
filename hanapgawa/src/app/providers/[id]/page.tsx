"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { fetchJson, pesos, timeAgo } from "@/lib/client";
import { Card, ErrorNote, KycBadge, Spinner, Stars } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { getCity, getRegion } from "@/lib/psgc";
import { useLang, useT } from "@/lib/i18n";
import { IconCalendar, IconMapPin } from "@/components/icons";

interface ProviderDetail {
  photoUrl?: string | null;
  id: string; firstName: string; lastInitial: string; bio?: string | null;
  cityCode: string; regionCode: string; kycLevel: number; memberSince: string;
  completedJobs: number; ratingAvg: number | null; ratingCount: number;
  categories: { categoryId: string; name: string; nameTl: string; icon: string; headline?: string | null; rateCents?: number | null; rateUnit?: string | null; yearsExp?: number | null }[];
  availability: { weekday: number; startMin: number; endMin: number }[];
}
interface ReviewRow { id: string; rating: number; comment?: string | null; createdAt: string; rater: { firstName: string; lastInitial: string } }

const DAYS_TL = ["Linggo", "Lunes", "Martes", "Miyerkules", "Huwebes", "Biyernes", "Sabado"];
const DAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
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
  const t = useT();
  const { lang } = useLang();
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
  const DAYS = lang === "en" ? DAYS_EN : DAYS_TL;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <Avatar photoUrl={p.photoUrl} firstName={p.firstName} lastInitial={p.lastInitial} size={64} />
            <div className="min-w-0">
            <h1 className="text-2xl font-bold">{p.firstName} {p.lastInitial}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <Stars value={p.ratingAvg} emptyLabel={t("Wala pang rating", "No ratings yet")} />
              {p.ratingCount > 0 && <span>({p.ratingCount} reviews)</span>}
              <span className="inline-flex items-center gap-1">· <IconMapPin size={13} /> {getCity(p.cityCode)?.name}, {getRegion(p.regionCode)?.short}</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <KycBadge level={p.kycLevel} />
              <span className="text-xs text-gray-500">
                {t("Member mula", "Member since")} {new Date(p.memberSince).toLocaleDateString("en-PH", { month: "short", year: "numeric" })}
              </span>
            </div>
            </div>
          </div>
          <div className="shrink-0 rounded-2xl bg-brand-50 px-4 py-3 text-center">
            <div className="text-2xl font-bold text-brand-800">{p.completedJobs}</div>
            <div className="text-xs text-brand-900">{t("tapos na trabaho", "jobs completed")}</div>
          </div>
        </div>
        {p.bio && <p className="mt-4 text-sm text-gray-700">{p.bio}</p>}
        <Link
          href={`/jobs/new?direct=${p.id}`}
          className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-700 px-5 py-3 text-base font-semibold text-white"
        >
          {t(`I-book si ${p.firstName} nang direkta`, `Book ${p.firstName} directly`)}
        </Link>
        <p className="mt-1 text-center text-xs text-gray-500">
          {t(
            "Siya lang ang makakakita ng request mo. Kapag kinumpirma niya, booked na agad — protektado ng escrow.",
            "Only they see your request. Once confirmed, it's booked immediately — protected by escrow.",
          )}
        </p>
      </Card>

      <Card>
        <h2 className="font-bold">{t("Mga serbisyo", "Services")}</h2>
        <div className="mt-3 space-y-2">
          {p.categories.map((c) => (
            <div key={c.categoryId} className="flex items-center justify-between rounded-xl bg-stone-50 p-3">
              <div>
                <div className="text-sm font-bold">
                  {c.icon} {lang === "en" ? c.name : c.nameTl}{" "}
                  <span className="font-normal text-gray-500">({lang === "en" ? c.nameTl : c.name})</span>
                </div>
                {c.headline && <div className="text-xs text-gray-600">{c.headline}</div>}
                {c.yearsExp != null && c.yearsExp > 0 && (
                  <div className="text-xs text-gray-500">{c.yearsExp} {t("taon ng karanasan", "yrs experience")}</div>
                )}
              </div>
              {c.rateCents && (
                <div className="text-sm font-bold text-brand-800">
                  {pesos(c.rateCents)}<span className="text-xs font-normal">{c.rateUnit ? RATE_UNIT[c.rateUnit] : ""}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {p.availability.length > 0 && (
        <Card>
          <h2 className="flex items-center gap-2 font-bold"><IconCalendar size={16} /> {t("Kailan available", "Availability")}</h2>
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
        <h2 className="font-bold">{t("Mga review", "Reviews")}</h2>
        {reviews.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">{t("Wala pang review.", "No reviews yet.")}</p>
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
