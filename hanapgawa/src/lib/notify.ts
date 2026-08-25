import { Prisma } from "@prisma/client";
import { db } from "./db";
import { formatPhp } from "./money";

// In-app notifications. Without these the marketplace does not actually
// work: a provider makes an offer and never learns it was accepted, so
// nobody comes back. Copy is Taglish, matching the rest of the product.
//
// Writes are best-effort by design — a failed notification must never roll
// back a booking or a payout. Call sites that already run inside a money
// transaction pass that transaction in so the notification commits with it.

type Tx = Prisma.TransactionClient | typeof db;

export type NotificationType =
  | "OFFER_RECEIVED"
  | "OFFER_ACCEPTED"
  | "OFFER_DECLINED"
  | "JOB_STARTED"
  | "JOB_DONE"
  | "JOB_COMPLETED"
  | "JOB_CANCELLED"
  | "MESSAGE"
  | "DISPUTE_OPENED"
  | "DISPUTE_RESOLVED"
  | "KYC_APPROVED"
  | "KYC_REJECTED"
  | "PAYOUT_PAID"
  | "PAYOUT_REJECTED"
  | "PAYMENT_RECEIVED"
  | "SOS_RAISED"
  | "SOS_RESOLVED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "JOB_NEARBY"
  | "JOB_INVITE"
  | "RELEASE_SOON"
  | "AUTO_RELEASED";

interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string;
  jobId?: string;
  tx?: Tx;
}

export async function notify(input: NotifyInput): Promise<void> {
  const client = input.tx ?? db;
  try {
    await client.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        href: input.href,
        jobId: input.jobId,
      },
    });
  } catch (e) {
    // Never let notification failure break the business action.
    console.error("notify failed", input.type, e);
  }
}

/* ---------- Typed helpers so copy lives in one place ---------- */

const jobHref = (jobId: string) => `/jobs/${jobId}`;

export const notifyOfferReceived = (
  clientId: string,
  jobId: string,
  jobTitle: string,
  providerName: string,
  priceCents: number,
  tx?: Tx,
) =>
  notify({
    userId: clientId,
    type: "OFFER_RECEIVED",
    title: "May bagong offer! 🙋",
    body: `${providerName} — ${formatPhp(priceCents)} para sa "${jobTitle}"`,
    href: jobHref(jobId),
    jobId,
    tx,
  });

export const notifyOfferAccepted = (
  providerId: string,
  jobId: string,
  jobTitle: string,
  priceCents: number,
  tx?: Tx,
) =>
  notify({
    userId: providerId,
    type: "OFFER_ACCEPTED",
    title: "Tinanggap ang offer mo! 🎉",
    body: `"${jobTitle}" — ${formatPhp(priceCents)}. Naka-hold na sa escrow ang bayad. Pwede ka nang magsimula.`,
    href: jobHref(jobId),
    jobId,
    tx,
  });

export const notifyOfferDeclined = (providerId: string, jobId: string, jobTitle: string, tx?: Tx) =>
  notify({
    userId: providerId,
    type: "OFFER_DECLINED",
    title: "Ibang provider ang napili",
    body: `Para sa "${jobTitle}". Marami pang trabaho — tingnan ang bago.`,
    href: "/jobs",
    jobId,
    tx,
  });

export const notifyJobStarted = (clientId: string, jobId: string, jobTitle: string, providerName: string, tx?: Tx) =>
  notify({
    userId: clientId,
    type: "JOB_STARTED",
    title: "Sinimulan na ang trabaho ▶",
    body: `${providerName} ay nagsimula na sa "${jobTitle}".`,
    href: jobHref(jobId),
    jobId,
    tx,
  });

export const notifyJobDone = (clientId: string, jobId: string, jobTitle: string, providerName: string, tx?: Tx) =>
  notify({
    userId: clientId,
    type: "JOB_DONE",
    title: "Tapos na — kailangan ng confirm mo ✔",
    body: `Sabi ni ${providerName}, tapos na ang "${jobTitle}". I-confirm para ma-release ang bayad.`,
    href: jobHref(jobId),
    jobId,
    tx,
  });

export const notifyJobCompleted = (
  providerId: string,
  jobId: string,
  jobTitle: string,
  payoutCents: number,
  tx?: Tx,
) =>
  notify({
    userId: providerId,
    type: "JOB_COMPLETED",
    title: `Bayad na! ${formatPhp(payoutCents)} 💰`,
    body: `Kinumpirma ng client ang "${jobTitle}". Nasa wallet mo na ang bayad.`,
    href: "/me?tab=wallet",
    jobId,
    tx,
  });

const dayMonth = (d: Date) =>
  d.toLocaleString("en-PH", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });

export const notifyReleaseSoon = (clientId: string, jobId: string, jobTitle: string, releaseAt: Date, tx?: Tx) =>
  notify({
    userId: clientId,
    type: "RELEASE_SOON",
    title: "Kailangan ng confirm mo ⏳",
    body: `Kung walang aksyon, awtomatikong ire-release ang bayad para sa "${jobTitle}" sa ${dayMonth(releaseAt)}. May problema? Mag-report bago pa iyon.`,
    href: jobHref(jobId),
    jobId,
    tx,
  });

export const notifyAutoReleased = (clientId: string, jobId: string, jobTitle: string, tx?: Tx) =>
  notify({
    userId: clientId,
    type: "AUTO_RELEASED",
    title: "Na-release na ang bayad",
    body: `Walang na-report na problema sa "${jobTitle}", kaya awtomatikong naibayad na ito sa provider.`,
    href: jobHref(jobId),
    jobId,
    tx,
  });

export const notifyJobCancelled = (userId: string, jobId: string, jobTitle: string, tx?: Tx) =>
  notify({
    userId,
    type: "JOB_CANCELLED",
    title: "Kanselado ang trabaho",
    body: `"${jobTitle}" ay kinansela. Kung may naka-hold na bayad, naibalik na ito.`,
    href: jobHref(jobId),
    jobId,
    tx,
  });

export const notifyMessage = (recipientId: string, jobId: string, senderName: string, preview: string, tx?: Tx) =>
  notify({
    userId: recipientId,
    type: "MESSAGE",
    title: `Bagong mensahe kay ${senderName} 💬`,
    body: preview.length > 90 ? preview.slice(0, 90) + "…" : preview,
    href: jobHref(jobId),
    jobId,
    tx,
  });

export const notifyDisputeOpened = (userId: string, jobId: string, jobTitle: string, tx?: Tx) =>
  notify({
    userId,
    type: "DISPUTE_OPENED",
    title: "May dispute sa trabaho ⚖️",
    body: `"${jobTitle}" — naka-freeze ang bayad hanggang maayos ito ng support team.`,
    href: jobHref(jobId),
    jobId,
    tx,
  });

export const notifyDisputeResolved = (userId: string, jobId: string, jobTitle: string, outcome: string, tx?: Tx) =>
  notify({
    userId,
    type: "DISPUTE_RESOLVED",
    title: "Naayos na ang dispute",
    body: `"${jobTitle}" — ${outcome}`,
    href: jobHref(jobId),
    jobId,
    tx,
  });

export const notifyKycDecision = (userId: string, approved: boolean, level: number, tx?: Tx) =>
  notify({
    userId,
    type: approved ? "KYC_APPROVED" : "KYC_REJECTED",
    title: approved ? `Verified na! Level ${level} ✅` : "Hindi na-approve ang verification",
    body: approved
      ? level >= 3
        ? "Fully Vetted ka na. Mas maraming client ang magtitiwala sa'yo."
        : "ID Verified ka na. Bukas na sa'yo ang mga trabahong ₱2,000 pataas."
      : "Pakisuri ang detalye at subukang muli. Siguraduhing tama ang last 4 digits ng ID mo.",
    href: "/me?tab=kyc",
    tx,
  });

export const notifyPayoutDecision = (userId: string, paid: boolean, amountCents: number, tx?: Tx) =>
  notify({
    userId,
    type: paid ? "PAYOUT_PAID" : "PAYOUT_REJECTED",
    title: paid ? `Na-send na ang ${formatPhp(amountCents)} 🏧` : "Hindi natuloy ang cash-out",
    body: paid
      ? "Tingnan ang GCash/Maya account mo. Salamat sa paggamit ng HanapGawa!"
      : `Naibalik sa wallet mo ang ${formatPhp(amountCents)}. Pakisuri ang account details at subukan ulit.`,
    href: "/me?tab=wallet",
    tx,
  });

export const notifyPaymentReceived = (userId: string, amountCents: number, tx?: Tx) =>
  notify({
    userId,
    type: "PAYMENT_RECEIVED",
    title: `Cash in: ${formatPhp(amountCents)} ✅`,
    body: "Nasa wallet mo na. Pwede ka nang mag-book ng serbisyo.",
    href: "/me?tab=wallet",
    tx,
  });
