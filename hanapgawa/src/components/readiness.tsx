"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/client";
import { useLang, useT } from "@/lib/i18n";
import type { ReadinessStep, StepId } from "@/lib/readiness";

interface Readiness {
  steps: ReadinessStep[];
  percent: number;
  blockedFrom: StepId[];
  ready: boolean;
}

/** Which tab on /me each step is fixed in. */
const TAB_FOR: Record<StepId, string> = {
  verify: "kyc",
  categories: "provider",
  rates: "provider",
  bio: "provider",
  kyc2: "kyc",
  contact: "safety",
  photo: "provider",
};

/**
 * The checklist a new provider needs and nobody else does. It disappears
 * entirely once they are reachable and their profile is filled in —
 * a permanent nag bar is how a dashboard becomes something people ignore.
 */
export function ReadinessCard({ onGoToTab }: { onGoToTab: (tab: string) => void }) {
  const t = useT();
  const { lang } = useLang();
  const [r, setR] = useState<Readiness | null>(null);

  useEffect(() => {
    fetchJson<{ readiness: Readiness | null }>("/api/provider/readiness")
      .then((d) => setR(d.readiness))
      .catch(() => setR(null));
  }, []);

  if (!r || r.percent === 100) return null;

  const remaining = r.steps.filter((s) => !s.done);
  const blocked = !r.ready;

  // Not <Card className="bg-amber-50">: Card already sets bg-white, and two
  // Tailwind utilities of equal specificity are settled by stylesheet order,
  // not class order — the override would silently do nothing.
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        blocked ? "border-amber-300 bg-amber-50" : "border-stone-200 bg-white"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-bold">
          {blocked ? t("Hindi ka pa nakikita ng mga kliyente", "Clients cannot see you yet") : t("Buuin ang profile mo", "Finish your profile")}
        </h2>
        <span className="text-sm font-bold text-brand-800">{r.percent}%</span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200">
        <div
          className={`h-full rounded-full ${blocked ? "bg-amber-500" : "bg-brand-600"}`}
          style={{ width: `${r.percent}%` }}
        />
      </div>

      {blocked && (
        <p className="mt-3 text-sm text-amber-900">
          {t("May mga trabahong pumapasok araw-araw, pero hindi ka pa namin kasama sa padala. Tapusin ang naka-highlight sa baba para makatanggap ka na.", "Jobs come in every day, but you are not in the send list yet. Finish the highlighted steps below to start receiving them.")}
        </p>
      )}

      <ul className="mt-3 space-y-2">
        {remaining.map((s) => (
          <li key={s.id}>
            <button
              onClick={() => onGoToTab(TAB_FOR[s.id])}
              className={`flex w-full items-start gap-3 rounded-xl p-3 text-left ${
                s.blocking ? "bg-white ring-1 ring-amber-300" : "bg-stone-50"
              }`}
            >
              <span aria-hidden className={`mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 ${s.blocking ? "border-amber-500 bg-amber-100" : "border-stone-300 bg-white"}`} />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-gray-900">{lang === "en" ? s.titleEn : s.title}</span>
                <span className="block text-xs text-gray-600">{lang === "en" ? s.whyEn : s.why}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {r.steps.some((s) => s.done) && (
        <p className="mt-3 text-xs text-gray-500">
          {t("Tapos na:", "Done:")} {r.steps.filter((s) => s.done).length} {t("sa", "of")} {r.steps.length}.
        </p>
      )}
    </div>
  );
}
