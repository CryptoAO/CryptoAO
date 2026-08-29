import Link from "next/link";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { Card } from "@/components/ui";
import { LANG_COOKIE, normalizeLang, tr } from "@/lib/i18n-shared";
import { initialJobs } from "@/lib/landing";
import { pesos, timeAgo } from "@/lib/format";
import { getCity } from "@/lib/psgc";
import { IconChat, IconLock, IconShieldCheck, IconWallet } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function Home() {
  const lang = normalizeLang((await cookies()).get(LANG_COOKIE)?.value);
  const t = (tl: string, en: string) => tr(lang, tl, en);

  const [categories, openJobs, providers, completed, latest] = await Promise.all([
    db.category.findMany({ where: { active: true }, orderBy: { sort: "asc" } }),
    db.job.count({ where: { status: "OPEN" } }),
    db.user.count({ where: { isProvider: true, status: "ACTIVE" } }),
    db.job.count({ where: { status: "COMPLETED" } }),
    initialJobs(3),
  ]);

  const trust = [
    {
      Icon: IconShieldCheck,
      title: t("Verified na tao.", "Verified people."),
      body: t(
        "Phone, valid ID, at NBI clearance verification para sa mga provider — kita mo ang badge.",
        "Phone, valid ID, and NBI clearance verification for providers — the badge tells you.",
      ),
    },
    {
      Icon: IconWallet,
      title: t("Escrow ang bayaran.", "Payments held in escrow."),
      body: t(
        "Hawak muna ng platform ang bayad. Walang “nauna na akong nagbayad, hindi na sumipot.”",
        "The platform holds the money until the work is confirmed done. No pay-first-then-ghosted.",
      ),
    },
    {
      Icon: IconChat,
      title: t("Chat sa loob ng app.", "Chat stays in the app."),
      body: t(
        "Bawal ang usapan sa labas — para may record at may proteksyon kayo pareho kapag may gulo.",
        "No off-platform deals — so there is a record, and both sides are protected if something goes wrong.",
      ),
    },
    {
      Icon: IconLock,
      title: t("Protektado ang datos mo.", "Your data is protected."),
      body: t(
        "Hindi namin ibinibigay ang number at address mo. Data Privacy Act compliant.",
        "We never hand out your number or address. Data Privacy Act compliant.",
      ),
    },
  ];

  const steps = [
    {
      n: "1",
      t: t("I-post o maghanap", "Post or browse"),
      d: t(
        "Sabihin kung ano ang kailangan mo — o mag-browse ng trabaho malapit sa'yo. Naka-sort per city at region.",
        "Say what you need — or browse jobs near you, sorted by city and region.",
      ),
    },
    {
      n: "2",
      t: t("Mag-usap sa app", "Talk in the app"),
      d: t(
        "Chat sa loob ng app — protektado kayo pareho. Ang bayad, naka-hold muna sa escrow bago magsimula.",
        "Chat inside the app — both of you are protected. Payment is held in escrow before work starts.",
      ),
    },
    {
      n: "3",
      t: t("Tapos? Bayad agad", "Done? Paid at once"),
      d: t(
        "Pag confirmed na tapos ang trabaho, release agad ang bayad sa provider. May rating pa kayo pareho.",
        "Once the work is confirmed done, payment releases to the provider. Both sides leave a rating.",
      ),
    },
  ];

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 px-6 py-10 text-white sm:px-10 sm:py-14">
        <h1 className="max-w-xl text-3xl font-bold leading-tight sm:text-4xl">
          {lang === "en" ? (
            <>Need a hand? <span className="text-sun-400">Someone can.</span></>
          ) : (
            <>May kailangan? <span className="text-sun-400">May kaya!</span></>
          )}
        </h1>
        <p className="mt-3 max-w-xl text-brand-100">
          {t(
            "Labada, linis-bahay, hatid-sundo, padala, dog walk, personal trainer — hanapin ang tao para dito, o kumita sa mga kaya mong gawin.",
            "Laundry, house cleaning, driving, deliveries, dog walking, personal training — find the right person, or earn from what you can do.",
          )}{" "}
          <strong className="text-white">{t("Bayad sa app, protektado ng escrow.", "Paid in-app, protected by escrow.")}</strong>
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/jobs/new"
            className="rounded-xl bg-sun-500 px-6 py-3.5 text-center text-base font-bold text-ink-900 hover:bg-sun-400"
          >
            {t("May kailangan ako — Mag-post", "I need something done — Post")}
          </Link>
          <Link
            href="/jobs"
            className="rounded-xl bg-white/10 px-6 py-3.5 text-center text-base font-bold text-white ring-1 ring-white/40 hover:bg-white/20"
          >
            {t("May kaya ako — Hanap Raket", "I can work — Find Jobs")}
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-3 gap-3 text-center text-sm">
          <div className="rounded-2xl bg-white/10 p-3">
            <div className="text-xl font-bold">{openJobs}</div>
            <div className="text-brand-100">{t("bukas na trabaho", "open jobs")}</div>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <div className="text-xl font-bold">{providers}</div>
            <div className="text-brand-100">{t("service providers", "service providers")}</div>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <div className="text-xl font-bold">{completed}</div>
            <div className="text-brand-100">{t("natapos na trabaho", "jobs completed")}</div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-gray-900">{t("Anong kailangan mo ngayon?", "What do you need today?")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {categories.map((c) => (
            <Link key={c.id} href={`/jobs?category=${c.id}`}>
              <Card className="flex h-full items-center gap-3 transition-shadow hover:shadow-md">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-stone-100 text-2xl">{c.icon}</span>
                <div>
                  <div className="text-sm font-bold">{lang === "en" ? c.name : c.nameTl}</div>
                  {c.name !== c.nameTl && (
                    <div className="text-xs text-gray-500">{lang === "en" ? c.nameTl : c.name}</div>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Latest jobs — real inventory, server-rendered */}
      {latest.jobs.length > 0 && (
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xl font-bold text-gray-900">{t("Mga bagong trabaho", "Newest jobs")}</h2>
            <Link href="/jobs" className="text-sm font-bold text-brand-800 underline">
              {t("Tingnan lahat →", "See all →")}
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {latest.jobs.map((j) => (
              <Link key={j.id} href={`/jobs/${j.id}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-stone-100 text-xl">{j.category.icon}</span>
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 text-sm font-bold leading-snug">{j.title}</h3>
                      <div className="mt-1 text-xs text-gray-500">
                        {getCity(j.cityCode)?.name ?? j.cityCode} · {timeAgo(j.createdAt)}
                      </div>
                      <div className="mt-1 text-sm font-bold text-brand-800">
                        {pesos(j.budgetCents)}{j.payType === "HOURLY" ? "/hr" : ""}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="grid gap-4 sm:grid-cols-3">
        {steps.map((s) => (
          <Card key={s.n}>
            <div className="mb-2 grid h-10 w-10 place-items-center rounded-full bg-brand-100 text-lg font-bold text-brand-800">
              {s.n}
            </div>
            <h3 className="font-bold">{s.t}</h3>
            <p className="mt-1 text-sm text-gray-600">{s.d}</p>
          </Card>
        ))}
      </section>

      {/* Trust strip */}
      <section className="rounded-3xl border border-brand-200 bg-brand-50 p-6">
        <h2 className="text-lg font-bold text-brand-900">{t("Bakit ligtas dito?", "Why it's safe here")}</h2>
        <div className="mt-3 grid gap-4 text-sm text-brand-900 sm:grid-cols-2">
          {trust.map(({ Icon, title, body }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 text-brand-700"><Icon size={20} /></span>
              <p><strong>{title}</strong> {body}</p>
            </div>
          ))}
        </div>
        <Link href="/safety" className="mt-4 inline-block text-sm font-bold text-brand-800 underline">
          {t("Basahin ang buong safety guide →", "Read the full safety guide →")}
        </Link>
      </section>
    </div>
  );
}
