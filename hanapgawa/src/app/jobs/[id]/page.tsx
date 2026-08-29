"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchJson, pesos, timeAgo } from "@/lib/client";
import { Badge, Button, Card, ErrorNote, Field, Input, KycBadge, Spinner, TextArea } from "@/components/ui";
import { ChatBox } from "@/components/chat";
import { SafetyPanel } from "@/components/safety";
import { Avatar } from "@/components/avatar";
import { JobPhotos } from "@/components/jobphotos";
import { getCity, getRegion } from "@/lib/psgc";
import { catName, useLang, useT } from "@/lib/i18n";
import { IconCalendar, IconCheck, IconLock, IconMapPin, IconRepeat, IconSend, IconUser, IconWallet } from "@/components/icons";

interface PublicUser { id: string; firstName: string; lastInitial: string; kycLevel: number; photoUrl?: string | null }
interface JobDetail {
  id: string; title: string; description: string; status: string;
  regionCode: string; cityCode: string; barangay?: string | null; addressNote?: string | null;
  payType: string; budgetCents: number; agreedPriceCents?: number | null;
  scheduledAt?: string | null; flexible: boolean; createdAt: string;
  clientId: string; assignedProviderId?: string | null;
  autoReleaseAt?: string | null; autoReleased?: boolean;
  visibility?: string; directProviderId?: string | null;
  client?: PublicUser; provider?: PublicUser;
  category: { id: string; name: string; nameTl: string; icon: string };
}
interface ProviderStats { completedJobs: number; reliabilityPct: number | null; repeatClients: number }
interface OfferAvailability { clash: boolean; outsideStatedHours: boolean }
interface OfferRow { id: string; providerId: string; priceCents: number; message: string; status: string; createdAt: string; provider?: PublicUser; providerStats?: ProviderStats; availability?: OfferAvailability; jobsWithYou?: number; sukiDiscount?: boolean }
interface Me { user: { id: string; isProvider: boolean; kycLevel: number } | null }

const STATUS_LABEL: Record<string, { tl: string; en: string; tone: "gray" | "green" | "amber" | "red" | "brand" }> = {
  OPEN: { tl: "Bukas — tumatanggap ng offers", en: "Open — accepting offers", tone: "green" },
  BOOKED: { tl: "Booked — may napili nang provider", en: "Booked — provider chosen", tone: "brand" },
  IN_PROGRESS: { tl: "Ginagawa na", en: "In progress", tone: "amber" },
  DONE_BY_PROVIDER: { tl: "Tapos na — hinihintay ang confirm", en: "Done — awaiting confirmation", tone: "amber" },
  COMPLETED: { tl: "Kumpleto — bayad na", en: "Completed — paid", tone: "green" },
  CANCELLED: { tl: "Kanselado", en: "Cancelled", tone: "gray" },
  DISPUTED: { tl: "May dispute — inaayos ng support", en: "Disputed — support is on it", tone: "red" },
};

function releaseWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-PH", {
    weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true,
  });
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const t = useT();
  const { lang } = useLang();
  const [data, setData] = useState<{ job: JobDetail; offers: OfferRow[]; viewerRole: string } | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [offerPrice, setOfferPrice] = useState("");
  const [offerMsg, setOfferMsg] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewDone, setReviewDone] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [showDispute, setShowDispute] = useState(false);

  const load = useCallback(async () => {
    const [d, m] = await Promise.all([
      fetchJson<{ job: JobDetail; offers: OfferRow[]; viewerRole: string }>(`/api/jobs/${id}`),
      fetchJson<Me>("/api/me"),
    ]);
    setData(d);
    setMe(m);
  }, [id]);

  useEffect(() => {
    load().catch((e) => setError((e as Error).message));
  }, [load]);

  if (error && !data) return <ErrorNote message={error} />;
  if (!data || !me) return <Spinner />;

  const { job, offers, viewerRole } = data;
  const meId = me.user?.id;
  const isOwner = viewerRole === "owner";
  const isDirectTarget = viewerRole === "direct-target";
  const isDirect = job.visibility === "DIRECT";
  const isAssigned = meId != null && job.assignedProviderId === meId;
  // A withdrawn offer doesn't block a fresh one — treat it as "no offer".
  const myOffer = meId ? offers.find((o) => o.providerId === meId && o.status !== "WITHDRAWN") : undefined;
  const status = STATUS_LABEL[job.status] ?? { tl: job.status, en: job.status, tone: "gray" as const };

  async function action(name: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setError(null);
    try {
      await fetchJson(`/api/jobs/${id}/actions`, { method: "POST", body: JSON.stringify({ action: name, ...extra }) });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function sendOffer(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await fetchJson("/api/offers", {
        method: "POST",
        body: JSON.stringify({ jobId: id, pricePhp: Number(offerPrice), message: offerMsg }),
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function acceptOffer(offerId: string) {
    setBusy(true);
    setError(null);
    try {
      await fetchJson(`/api/offers/${offerId}`, { method: "POST", body: JSON.stringify({ action: "accept" }) });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await fetchJson("/api/reviews", {
        method: "POST",
        body: JSON.stringify({ jobId: id, rating: reviewRating, comment: reviewComment || undefined }),
      });
      setReviewDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-stone-100 text-3xl">{job.category.icon}</span>
            <div>
              <h1 className="text-xl font-bold leading-snug">{job.title}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <Badge tone="brand">{catName(lang, job.category)}</Badge>
                <Badge tone={status.tone}>{t(status.tl, status.en)}</Badge>
                <span>· {timeAgo(job.createdAt)}</span>
              </div>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xl font-bold text-brand-800">{pesos(job.agreedPriceCents ?? job.budgetCents)}</div>
            <div className="text-xs text-gray-500">{job.payType === "HOURLY" ? "per hour" : t("buong trabaho", "whole job")}</div>
          </div>
        </div>

        <p className="mt-4 whitespace-pre-wrap text-sm text-gray-700">{job.description}</p>

        <div className="mt-4 grid gap-2 rounded-xl bg-stone-50 p-3 text-sm text-gray-700">
          <div className="flex items-center gap-2"><IconMapPin size={15} className="shrink-0 text-gray-400" /> {job.barangay ? `Brgy. ${job.barangay}, ` : ""}{getCity(job.cityCode)?.name ?? job.cityCode}, {getRegion(job.regionCode)?.short}</div>
          {job.scheduledAt && <div className="flex items-center gap-2"><IconCalendar size={15} className="shrink-0 text-gray-400" /> {new Date(job.scheduledAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}{job.flexible ? " (flexible)" : ""}</div>}
          {job.addressNote && (
            <div className="flex items-start gap-2 rounded-lg bg-brand-50 p-2 text-brand-900">
              <IconLock size={15} className="mt-0.5 shrink-0" /> <span><strong>Exact address</strong> {t("(kayo lang nakakakita nito):", "(only the two of you see this):")} {job.addressNote}</span>
            </div>
          )}
          {job.client && (
            <div className="flex items-center gap-2">
              <IconUser size={15} className="shrink-0 text-gray-400" /> {t("Naka-post:", "Posted by:")} <strong>{job.client.firstName} {job.client.lastInitial}</strong> <KycBadge level={job.client.kycLevel} />
            </div>
          )}
          {job.provider && (
            <div className="flex items-center gap-2">
              <IconUser size={15} className="shrink-0 text-gray-400" /> Provider: <Link href={`/providers/${job.provider.id}`} className="font-bold underline">{job.provider.firstName} {job.provider.lastInitial}</Link>
              <KycBadge level={job.provider.kycLevel} />
            </div>
          )}
        </div>
      </Card>

      <ErrorNote message={error} />

      {/* ===== Not logged in ===== */}
      {!meId && job.status === "OPEN" && (
        <Card className="text-center">
          <p className="text-sm text-gray-600">{t("Gusto mo bang gawin ang trabahong ito?", "Want to take this job?")}</p>
          <Link href="/register" className="mt-2 inline-block rounded-xl bg-brand-700 px-6 py-3 font-bold text-white">
            {t("Sign up para mag-offer — libre!", "Sign up to make an offer — free!")}
          </Link>
        </Card>
      )}

      {/* ===== Direct request: the target answers ===== */}
      {isDirectTarget && job.status === "OPEN" && (
        <Card className="space-y-3">
          <h2 className="flex items-center gap-2 font-bold"><IconSend size={16} /> {t("Booking request para sa'yo", "A booking request for you")}</h2>
          <div className="rounded-xl bg-brand-50 p-3 text-sm text-brand-900">
            {t("Ikaw lang ang inalok ng trabahong ito, sa presyong", "This job was offered to you alone, at")}{" "}
            <strong>{pesos(job.budgetCents)}</strong>. {t("Kapag kinumpirma mo,", "Once you confirm, it's")} <strong>{t("booked na agad", "booked immediately")}</strong> —
            {t("maho-hold ang bayad sa escrow at asahan ka na ng client.", "payment goes on hold in escrow and the client will be expecting you.")}
          </div>
          <div className="flex gap-2">
            <Button full disabled={busy} onClick={() => action("confirm")}>
              {t("Kumpirmahin — tanggapin ko", "Confirm — I accept")}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => action("decline")}>
              {t("Hindi muna", "Not this time")}
            </Button>
          </div>
        </Card>
      )}

      {/* ===== Direct request: the owner waits ===== */}
      {isOwner && isDirect && job.status === "OPEN" && (
        <Card className="space-y-3">
          <h2 className="font-bold">{t("Hinihintay ang sagot", "Waiting for their answer")}</h2>
          <p className="text-sm text-gray-600">
            {t("Naipadala na ang booking request mo. Kapag kinumpirma, maho-hold ang", "Your booking request is on its way. Once they confirm,")}{" "}
            <strong>{pesos(job.budgetCents)}</strong> {t("mula sa wallet mo at booked na agad. Kung walang sagot sa loob ng 48 oras, isasara namin ito para makapag-post ka sa lahat.", "goes on hold from your wallet and it's booked. If there's no answer within 48 hours, we close it so you can post to everyone.")}
          </p>
          <Button variant="ghost" disabled={busy} onClick={() => action("cancel")}>
            {t("Bawiin ang request", "Withdraw the request")}
          </Button>
        </Card>
      )}

      {/* ===== Provider: make an offer ===== */}
      {meId && !isOwner && !isDirect && job.status === "OPEN" && !myOffer && (
        <Card>
          <h2 className="font-bold">{t("Gawin ko 'to!", "I want this job!")}</h2>
          {!me.user?.isProvider ? (
            <p className="mt-2 text-sm text-gray-600">
              {t("I-set up muna ang provider profile mo (2 minuto lang) sa", "First set up your provider profile (2 minutes) under")}{" "}
              <Link href="/me?tab=provider" className="font-bold text-brand-800 underline">{t("Ako → Provider", "Me → Provider")}</Link>.
            </p>
          ) : (
            <form onSubmit={sendOffer} className="mt-3 space-y-3">
              <Field label={t("Presyo mo (₱)", "Your price (₱)")} hint={t(`Budget ng client: ${pesos(job.budgetCents)}`, `Client budget: ${pesos(job.budgetCents)}`)}>
                <Input type="number" inputMode="decimal" min={1} value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} required />
              </Field>
              <Field label={t("Maikling message", "Short message")} hint={t("Bakit ikaw ang dapat piliin? Kailan ka pwede?", "Why should they pick you? When are you free?")}>
                <TextArea value={offerMsg} onChange={(e) => setOfferMsg(e.target.value)} required maxLength={1000} />
              </Field>
              <Button type="submit" full disabled={busy}>{t("Ipadala ang offer", "Send offer")}</Button>
            </form>
          )}
        </Card>
      )}

      {/* ===== Provider: my offer + chat ===== */}
      {meId && myOffer && !isAssigned && (
        <Card>
          <h2 className="font-bold">{t("Ang offer mo", "Your offer")}</h2>
          <div className="mt-2 flex items-center justify-between rounded-xl bg-stone-50 p-3 text-sm">
            <span>{pesos(myOffer.priceCents)} — {myOffer.message}</span>
            <Badge tone={myOffer.status === "PENDING" ? "amber" : myOffer.status === "ACCEPTED" ? "green" : "gray"}>{myOffer.status}</Badge>
          </div>
          {myOffer.status === "PENDING" && (
            <Button
              variant="ghost"
              className="mt-2"
              disabled={busy}
              onClick={async () => {
                await fetchJson(`/api/offers/${myOffer.id}`, { method: "POST", body: JSON.stringify({ action: "withdraw" }) }).catch(() => {});
                await load();
              }}
            >
              {t("Bawiin ang offer", "Withdraw offer")}
            </Button>
          )}
          <div className="mt-3">
            <ChatBox jobId={job.id} withUserId={job.clientId} meId={meId} />
          </div>
        </Card>
      )}

      {/* ===== Owner: offers list ===== */}
      {isOwner && !isDirect && job.status === "OPEN" && (
        <Card>
          <h2 className="font-bold">{t("Mga offer", "Offers")} ({offers.filter((o) => o.status === "PENDING").length})</h2>
          {offers.filter((o) => o.status === "PENDING").length === 0 && (
            <p className="mt-2 text-sm text-gray-500">{t("Wala pang offer. Balikan mo mamaya — o i-share ang job link.", "No offers yet. Check back later — or share the job link.")}</p>
          )}
          <div className="mt-3 space-y-3">
            {offers.filter((o) => o.status === "PENDING").map((o) => (
              <div key={o.id} className="rounded-xl border border-stone-200 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Avatar
                      photoUrl={o.provider?.photoUrl}
                      firstName={o.provider?.firstName}
                      lastInitial={o.provider?.lastInitial}
                      size={36}
                    />
                    <Link href={`/providers/${o.providerId}`} className="font-bold underline">
                      {o.provider?.firstName} {o.provider?.lastInitial}
                    </Link>
                    {o.provider && <KycBadge level={o.provider.kycLevel} />}
                  </div>
                  <div className="text-lg font-bold text-brand-800">{pesos(o.priceCents)}</div>
                </div>
                {o.providerStats && (o.providerStats.completedJobs > 0 || o.providerStats.repeatClients > 0) && (
                  <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-gray-600">
                    <span className="rounded-full bg-stone-100 px-2 py-0.5">
                      {o.providerStats.completedJobs} {t("tapos na trabaho", "jobs completed")}
                    </span>
                    {o.providerStats.reliabilityPct != null && (
                      <span className="rounded-full bg-stone-100 px-2 py-0.5">
                        {o.providerStats.reliabilityPct}% {t("natapos", "completion")}
                      </span>
                    )}
                    {o.providerStats.repeatClients > 0 && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800">
                        {o.providerStats.repeatClients} {t("paulit-ulit na client", "repeat clients")}
                      </span>
                    )}
                    {(o.jobsWithYou ?? 0) >= 3 && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">
                        ★ {t(`Suki niyo na (${o.jobsWithYou} trabaho ninyo) — mas mababa ang platform fee`, `Your regular (${o.jobsWithYou} jobs together) — lower platform fee`)}
                      </span>
                    )}
                  </div>
                )}
                {o.availability?.clash ? (
                  <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-800">
                    {t("May ibang booking na siya sa oras na iyan. Kailangang baguhin ang oras o pumili ng iba.", "They already have a booking at that time. Change the schedule or choose someone else.")}
                  </p>
                ) : o.availability?.outsideStatedHours ? (
                  <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
                    {t("Nasa labas ito ng oras na nilagay niyang available siya. Pwede pa ring tanggapin — kausapin lang muna siya para sigurado.", "This falls outside their stated hours. You can still accept — just check with them first to be sure.")}
                  </p>
                ) : null}
                <p className="mt-1 text-sm text-gray-600">{o.message}</p>
                <div className="mt-2 flex gap-2">
                  <Button
                    disabled={busy || o.availability?.clash}
                    onClick={() => acceptOffer(o.id)}
                    className="min-h-10 px-4 py-2 text-sm"
                  >
                    {t(`Tanggapin (i-hold ang ${pesos(o.priceCents)})`, `Accept (hold ${pesos(o.priceCents)})`)}
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={busy}
                    className="min-h-10 px-4 py-2 text-sm"
                    onClick={async () => {
                      await fetchJson(`/api/offers/${o.id}`, { method: "POST", body: JSON.stringify({ action: "decline" }) }).catch(() => {});
                      await load();
                    }}
                  >
                    {t("Hindi muna", "Pass")}
                  </Button>
                </div>
                {meId && <div className="mt-3"><ChatBox jobId={job.id} withUserId={o.providerId} meId={meId} /></div>}
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-stone-100 pt-3">
            <Button variant="ghost" disabled={busy} onClick={() => action("cancel")}>{t("I-cancel ang job na ito", "Cancel this job")}</Button>
          </div>
        </Card>
      )}

      {/* ===== Booked / in-progress panel ===== */}
      {meId && (isOwner || isAssigned) && ["BOOKED", "IN_PROGRESS", "DONE_BY_PROVIDER", "DISPUTED"].includes(job.status) && (
        <Card className="space-y-3">
          <h2 className="font-bold">{t("Status ng trabaho", "Job status")}</h2>
          <div className="flex items-start gap-2 rounded-xl bg-brand-50 p-3 text-sm text-brand-900">
            <IconWallet size={16} className="mt-0.5 shrink-0" />
            <span>
            <strong>{pesos(job.agreedPriceCents ?? 0)}</strong> —{" "}
            {job.status === "DISPUTED"
              ? t("naka-freeze sa escrow habang inaayos ng support ang dispute.", "frozen in escrow while support resolves the dispute.")
              : job.status === "DONE_BY_PROVIDER"
                ? t("naka-hold pa rin sa escrow. Ire-release ito kapag kinumpirma ng client — o awtomatiko kapag lumipas ang deadline sa baba.", "still held in escrow. It releases when the client confirms — or automatically after the deadline below.")
                : t("naka-hold sa escrow. Ire-release lang kapag kinumpirma ng client na tapos ang trabaho.", "held in escrow. It only releases once the client confirms the work is done.")}
            </span>
          </div>

          {job.status === "DONE_BY_PROVIDER" && job.autoReleaseAt && (
            <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              {t("Awtomatikong ire-release ang bayad sa", "Payment auto-releases on")}{" "}
              <strong>{releaseWhen(job.autoReleaseAt)}</strong>{" "}
              {isOwner
                ? t("kung walang na-report na problema. Hindi mo na kailangang hintayin — pwede mo nang kumpirmahin ngayon.", "if no problem is reported. No need to wait — you can confirm now.")
                : t("kahit hindi pa kumpirmahin ng client — hindi mahihinto ang bayad mo dahil lang nakalimutan nila.", "even if the client forgets to confirm — your pay is not stalled by their silence.")}
            </div>
          )}

          {isAssigned && job.status === "BOOKED" && (
            <Button full disabled={busy} onClick={() => action("start")}>{t("Sisimulan ko na ang trabaho", "Starting the job now")}</Button>
          )}
          {isAssigned && job.status === "IN_PROGRESS" && (
            <Button full disabled={busy} onClick={() => action("done")}>{t("Tapos na ako", "Work is done")}</Button>
          )}
          {isOwner && job.status === "DONE_BY_PROVIDER" && (
            <Button full disabled={busy} onClick={() => action("complete")}>
              {t("Kumpirmahin — i-release ang bayad", "Confirm — release payment")}
            </Button>
          )}
          {isOwner && ["BOOKED"].includes(job.status) && (
            <Button variant="ghost" disabled={busy} onClick={() => action("cancel")}>{t("I-cancel (ibabalik ang hold)", "Cancel (hold is refunded)")}</Button>
          )}

          {job.status === "DISPUTED" ? null : !showDispute ? (
            <button className="text-sm font-semibold text-red-600 underline" onClick={() => setShowDispute(true)}>
              {t("May problema? Mag-file ng dispute", "Something wrong? File a dispute")}
            </button>
          ) : (
            <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
              <TextArea value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} placeholder={t("Ikwento kung ano ang nangyari…", "Tell us what happened…")} />
              <Button variant="danger" disabled={busy || disputeReason.trim().length < 5} onClick={() => action("dispute", { reason: disputeReason })}>
                {t("I-submit ang dispute", "Submit dispute")}
              </Button>
            </div>
          )}

          <JobPhotos jobId={job.id} meId={meId} />

          <SafetyPanel jobId={job.id} meId={meId} />

          <ChatBox jobId={job.id} withUserId={isOwner ? job.assignedProviderId! : job.clientId} meId={meId} />
        </Card>
      )}

      {/* ===== Completed: review ===== */}
      {meId && (isOwner || isAssigned) && job.status === "COMPLETED" && (
        <Card>
          <h2 className="font-bold">{t("Salamat! I-rate ang naging karanasan mo", "Thank you! Rate your experience")}</h2>
          {reviewDone ? (
            <p className="mt-2 text-sm text-emerald-700">{t("Na-save ang review mo. Salamat!", "Your review is saved. Thank you!")}</p>
          ) : (
            <form onSubmit={submitReview} className="mt-3 space-y-3">
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setReviewRating(n)}
                    className={`text-3xl ${n <= reviewRating ? "text-amber-400" : "text-stone-300"}`}
                    aria-label={`${n} star`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <TextArea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder={t("Kwento mo… (optional)", "Your story… (optional)")} maxLength={1000} />
              <Button type="submit" disabled={busy}>{t("I-submit ang review", "Submit review")}</Button>
            </form>
          )}
        </Card>
      )}

      {/* ===== Completed: book the same provider again ===== */}
      {isOwner && job.status === "COMPLETED" && job.provider && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-bold"><IconRepeat size={16} /> {t("Maganda ang serbisyo?", "Happy with the service?")}</h2>
            <p className="mt-0.5 text-sm text-gray-600">
              {t(`I-book ulit si ${job.provider.firstName} — mapupunta agad sa kanya ang bagong post mo.`, `Rebook ${job.provider.firstName} — your new post goes straight to them.`)}
            </p>
          </div>
          <Link
            href={`/jobs/new?rebook=${job.id}`}
            className="rounded-xl bg-brand-700 px-5 py-3 text-sm font-bold text-white"
          >
            {t("I-book ulit", "Rebook")}
          </Link>
        </Card>
      )}

      {job.status === "DISPUTED" && (
        <Card className="border-red-200 bg-red-50 text-sm text-red-800">
          {t("May open dispute ang trabahong ito. Naka-freeze ang escrow habang inaayos ng support team. Tingnan ang messages mo para sa updates.", "This job has an open dispute. Escrow is frozen while the support team resolves it. Check your messages for updates.")}
        </Card>
      )}
    </div>
  );
}
