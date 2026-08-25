"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchJson, pesos, timeAgo } from "@/lib/client";
import { Badge, Button, Card, ErrorNote, Field, Input, KycBadge, Spinner, TextArea } from "@/components/ui";
import { ChatBox } from "@/components/chat";
import { SafetyPanel } from "@/components/safety";
import { JobPhotos } from "@/components/jobphotos";
import { getCity, getRegion } from "@/lib/psgc";

interface PublicUser { id: string; firstName: string; lastInitial: string; kycLevel: number }
interface JobDetail {
  id: string; title: string; description: string; status: string;
  regionCode: string; cityCode: string; barangay?: string | null; addressNote?: string | null;
  payType: string; budgetCents: number; agreedPriceCents?: number | null;
  scheduledAt?: string | null; flexible: boolean; createdAt: string;
  clientId: string; assignedProviderId?: string | null;
  autoReleaseAt?: string | null; autoReleased?: boolean;
  client?: PublicUser; provider?: PublicUser;
  category: { id: string; name: string; nameTl: string; icon: string };
}
interface ProviderStats { completedJobs: number; reliabilityPct: number | null; repeatClients: number }
interface OfferRow { id: string; providerId: string; priceCents: number; message: string; status: string; createdAt: string; provider?: PublicUser; providerStats?: ProviderStats }
interface Me { user: { id: string; isProvider: boolean; kycLevel: number } | null }

const STATUS_LABEL: Record<string, { label: string; tone: "gray" | "green" | "amber" | "red" | "brand" }> = {
  OPEN: { label: "Bukas — tumatanggap ng offers", tone: "green" },
  BOOKED: { label: "Booked — may napili nang provider", tone: "brand" },
  IN_PROGRESS: { label: "Ginagawa na", tone: "amber" },
  DONE_BY_PROVIDER: { label: "Tapos na — hinihintay ang confirm", tone: "amber" },
  COMPLETED: { label: "Kumpleto ✔ Bayad na", tone: "green" },
  CANCELLED: { label: "Kanselado", tone: "gray" },
  DISPUTED: { label: "May dispute — inaayos ng support", tone: "red" },
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
  const isAssigned = meId != null && job.assignedProviderId === meId;
  // A withdrawn offer doesn't block a fresh one — treat it as "no offer".
  const myOffer = meId ? offers.find((o) => o.providerId === meId && o.status !== "WITHDRAWN") : undefined;
  const status = STATUS_LABEL[job.status] ?? { label: job.status, tone: "gray" as const };

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
            <span className="text-4xl">{job.category.icon}</span>
            <div>
              <h1 className="text-xl font-extrabold leading-snug">{job.title}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <Badge tone="brand">{job.category.nameTl}</Badge>
                <Badge tone={status.tone}>{status.label}</Badge>
                <span>· {timeAgo(job.createdAt)}</span>
              </div>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xl font-extrabold text-brand-800">{pesos(job.agreedPriceCents ?? job.budgetCents)}</div>
            <div className="text-xs text-gray-500">{job.payType === "HOURLY" ? "per hour" : "buong trabaho"}</div>
          </div>
        </div>

        <p className="mt-4 whitespace-pre-wrap text-sm text-gray-700">{job.description}</p>

        <div className="mt-4 grid gap-2 rounded-xl bg-stone-50 p-3 text-sm text-gray-700">
          <div>📍 {job.barangay ? `Brgy. ${job.barangay}, ` : ""}{getCity(job.cityCode)?.name ?? job.cityCode}, {getRegion(job.regionCode)?.short}</div>
          {job.scheduledAt && <div>🗓️ {new Date(job.scheduledAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}{job.flexible ? " (flexible)" : ""}</div>}
          {job.addressNote && (
            <div className="rounded-lg bg-brand-50 p-2 text-brand-900">
              🔒 <strong>Exact address</strong> (kayo lang nakakakita nito): {job.addressNote}
            </div>
          )}
          {job.client && (
            <div className="flex items-center gap-2">
              👤 Naka-post: <strong>{job.client.firstName} {job.client.lastInitial}</strong> <KycBadge level={job.client.kycLevel} />
            </div>
          )}
          {job.provider && (
            <div className="flex items-center gap-2">
              🧰 Provider: <Link href={`/providers/${job.provider.id}`} className="font-bold underline">{job.provider.firstName} {job.provider.lastInitial}</Link>
              <KycBadge level={job.provider.kycLevel} />
            </div>
          )}
        </div>
      </Card>

      <ErrorNote message={error} />

      {/* ===== Not logged in ===== */}
      {!meId && job.status === "OPEN" && (
        <Card className="text-center">
          <p className="text-sm text-gray-600">Gusto mo bang gawin ang trabahong ito?</p>
          <Link href="/register" className="mt-2 inline-block rounded-xl bg-brand-700 px-6 py-3 font-bold text-white">
            Sign up para mag-offer — libre!
          </Link>
        </Card>
      )}

      {/* ===== Provider: make an offer ===== */}
      {meId && !isOwner && job.status === "OPEN" && !myOffer && (
        <Card>
          <h2 className="font-bold">Gawin ko 'to! 🙋</h2>
          {!me.user?.isProvider ? (
            <p className="mt-2 text-sm text-gray-600">
              I-set up muna ang provider profile mo (2 minuto lang) sa{" "}
              <Link href="/me?tab=provider" className="font-bold text-brand-800 underline">Ako → Provider</Link>.
            </p>
          ) : (
            <form onSubmit={sendOffer} className="mt-3 space-y-3">
              <Field label="Presyo mo (₱)" hint={`Budget ng client: ${pesos(job.budgetCents)}`}>
                <Input type="number" inputMode="decimal" min={1} value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} required />
              </Field>
              <Field label="Maikling message" hint="Bakit ikaw ang dapat piliin? Kailan ka pwede?">
                <TextArea value={offerMsg} onChange={(e) => setOfferMsg(e.target.value)} required maxLength={1000} />
              </Field>
              <Button type="submit" full disabled={busy}>Ipadala ang offer</Button>
            </form>
          )}
        </Card>
      )}

      {/* ===== Provider: my offer + chat ===== */}
      {meId && myOffer && !isAssigned && (
        <Card>
          <h2 className="font-bold">Ang offer mo</h2>
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
              Bawiin ang offer
            </Button>
          )}
          <div className="mt-3">
            <ChatBox jobId={job.id} withUserId={job.clientId} meId={meId} />
          </div>
        </Card>
      )}

      {/* ===== Owner: offers list ===== */}
      {isOwner && job.status === "OPEN" && (
        <Card>
          <h2 className="font-bold">Mga offer ({offers.filter((o) => o.status === "PENDING").length})</h2>
          {offers.filter((o) => o.status === "PENDING").length === 0 && (
            <p className="mt-2 text-sm text-gray-500">Wala pang offer. Balikan mo mamaya — o i-share ang job link.</p>
          )}
          <div className="mt-3 space-y-3">
            {offers.filter((o) => o.status === "PENDING").map((o) => (
              <div key={o.id} className="rounded-xl border border-stone-200 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Link href={`/providers/${o.providerId}`} className="font-bold underline">
                      {o.provider?.firstName} {o.provider?.lastInitial}
                    </Link>
                    {o.provider && <KycBadge level={o.provider.kycLevel} />}
                  </div>
                  <div className="text-lg font-extrabold text-brand-800">{pesos(o.priceCents)}</div>
                </div>
                {o.providerStats && (o.providerStats.completedJobs > 0 || o.providerStats.repeatClients > 0) && (
                  <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-gray-600">
                    <span className="rounded-full bg-stone-100 px-2 py-0.5">
                      ✔ {o.providerStats.completedJobs} tapos na trabaho
                    </span>
                    {o.providerStats.reliabilityPct != null && (
                      <span className="rounded-full bg-stone-100 px-2 py-0.5">
                        {o.providerStats.reliabilityPct}% natapos
                      </span>
                    )}
                    {o.providerStats.repeatClients > 0 && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800">
                        🔁 {o.providerStats.repeatClients} paulit-ulit na client
                      </span>
                    )}
                  </div>
                )}
                <p className="mt-1 text-sm text-gray-600">{o.message}</p>
                <div className="mt-2 flex gap-2">
                  <Button disabled={busy} onClick={() => acceptOffer(o.id)} className="min-h-10 px-4 py-2 text-sm">
                    ✔ Tanggapin (i-hold ang {pesos(o.priceCents)})
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
                    Hindi muna
                  </Button>
                </div>
                {meId && <div className="mt-3"><ChatBox jobId={job.id} withUserId={o.providerId} meId={meId} /></div>}
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-stone-100 pt-3">
            <Button variant="ghost" disabled={busy} onClick={() => action("cancel")}>I-cancel ang job na ito</Button>
          </div>
        </Card>
      )}

      {/* ===== Booked / in-progress panel ===== */}
      {meId && (isOwner || isAssigned) && ["BOOKED", "IN_PROGRESS", "DONE_BY_PROVIDER", "DISPUTED"].includes(job.status) && (
        <Card className="space-y-3">
          <h2 className="font-bold">Status ng trabaho</h2>
          <div className="rounded-xl bg-brand-50 p-3 text-sm text-brand-900">
            💰 <strong>{pesos(job.agreedPriceCents ?? 0)}</strong> —{" "}
            {job.status === "DISPUTED"
              ? "naka-freeze sa escrow habang inaayos ng support ang dispute."
              : job.status === "DONE_BY_PROVIDER"
                ? "naka-hold pa rin sa escrow. Ire-release ito kapag kinumpirma ng client — o awtomatiko kapag lumipas ang deadline sa baba."
                : "naka-hold sa escrow. Ire-release lang kapag kinumpirma ng client na tapos ang trabaho."}
          </div>

          {job.status === "DONE_BY_PROVIDER" && job.autoReleaseAt && (
            <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              ⏳ Awtomatikong ire-release ang bayad sa{" "}
              <strong>{releaseWhen(job.autoReleaseAt)}</strong>{" "}
              {isOwner
                ? "kung walang na-report na problema. Hindi mo na kailangang hintayin — pwede mo nang kumpirmahin ngayon."
                : "kahit hindi pa kumpirmahin ng client — hindi mahihinto ang bayad mo dahil lang nakalimutan nila."}
            </div>
          )}

          {isAssigned && job.status === "BOOKED" && (
            <Button full disabled={busy} onClick={() => action("start")}>▶ Sisimulan ko na ang trabaho</Button>
          )}
          {isAssigned && job.status === "IN_PROGRESS" && (
            <Button full disabled={busy} onClick={() => action("done")}>✔ Tapos na ako</Button>
          )}
          {isOwner && job.status === "DONE_BY_PROVIDER" && (
            <Button full disabled={busy} onClick={() => action("complete")}>
              ✔ Kumpirmahin — i-release ang bayad
            </Button>
          )}
          {isOwner && ["BOOKED"].includes(job.status) && (
            <Button variant="ghost" disabled={busy} onClick={() => action("cancel")}>I-cancel (ibabalik ang hold)</Button>
          )}

          {job.status === "DISPUTED" ? null : !showDispute ? (
            <button className="text-sm font-semibold text-red-600 underline" onClick={() => setShowDispute(true)}>
              May problema? Mag-file ng dispute
            </button>
          ) : (
            <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
              <TextArea value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} placeholder="Ikwento kung ano ang nangyari…" />
              <Button variant="danger" disabled={busy || disputeReason.trim().length < 5} onClick={() => action("dispute", { reason: disputeReason })}>
                I-submit ang dispute
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
          <h2 className="font-bold">Salamat! 🎉 I-rate ang naging karanasan mo</h2>
          {reviewDone ? (
            <p className="mt-2 text-sm text-emerald-700">Na-save ang review mo. Salamat!</p>
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
              <TextArea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Kwento mo… (optional)" maxLength={1000} />
              <Button type="submit" disabled={busy}>I-submit ang review</Button>
            </form>
          )}
        </Card>
      )}

      {/* ===== Completed: book the same provider again ===== */}
      {isOwner && job.status === "COMPLETED" && job.provider && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">Maganda ang serbisyo? 🔁</h2>
            <p className="mt-0.5 text-sm text-gray-600">
              I-book ulit si {job.provider.firstName} — mapupunta agad sa kanya ang bagong post mo.
            </p>
          </div>
          <Link
            href={`/jobs/new?rebook=${job.id}`}
            className="rounded-xl bg-brand-700 px-5 py-3 text-sm font-bold text-white"
          >
            I-book ulit
          </Link>
        </Card>
      )}

      {job.status === "DISPUTED" && (
        <Card className="border-red-200 bg-red-50 text-sm text-red-800">
          ⚖️ May open dispute ang trabahong ito. Naka-freeze ang escrow habang inaayos ng support team. Tingnan ang messages mo para sa updates.
        </Card>
      )}
    </div>
  );
}
