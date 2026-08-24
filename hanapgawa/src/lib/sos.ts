import { db } from "./db";
import { ApiError } from "./api";
import { smsSender } from "./sms";
import { notify } from "./notify";

// Emergency support. Design rule that overrides every other convention in
// this codebase: an SOS is ALWAYS recorded. We never rate-limit a panic
// button into uselessness, never require KYC to press it, and never fail
// the request because a downstream notification failed. The worst outcome
// of a false alarm is a wasted phone call; the worst outcome of a swallowed
// alert is somebody alone in a stranger's house with no help coming.

/** Statuses a job must be in for an SOS to attach to it. */
const ACTIVE_JOB_STATES = ["BOOKED", "IN_PROGRESS", "DONE_BY_PROVIDER", "DISPUTED"];

export interface RaiseSosInput {
  userId: string;
  jobId?: string;
  lat?: number;
  lng?: number;
  note?: string;
}

export async function raiseSos(input: RaiseSosInput) {
  const user = await db.user.findUnique({
    where: { id: input.userId },
    include: { trustedContacts: true },
  });
  if (!user) throw new ApiError(404, "Account not found");

  // Attach to the job only if it's genuinely theirs and active — but a bad
  // jobId must never block the alert, so we downgrade rather than throw.
  let jobId: string | undefined;
  let counterpartyId: string | undefined;
  let jobTitle: string | undefined;
  if (input.jobId) {
    const job = await db.job.findUnique({ where: { id: input.jobId } });
    if (
      job &&
      ACTIVE_JOB_STATES.includes(job.status) &&
      (job.clientId === user.id || job.assignedProviderId === user.id)
    ) {
      jobId = job.id;
      jobTitle = job.title;
      counterpartyId = job.clientId === user.id ? job.assignedProviderId ?? undefined : job.clientId;
    }
  }

  // 1. Write the record FIRST. Everything after this is best-effort.
  const alert = await db.sosAlert.create({
    data: {
      userId: user.id,
      jobId,
      lat: input.lat,
      lng: input.lng,
      note: input.note,
    },
  });

  // 2. Text every trusted contact. Count only the ones that actually sent.
  const where = jobTitle ? ` habang ginagawa ang "${jobTitle}"` : "";
  const place = input.lat != null && input.lng != null
    ? ` Huling lokasyon: https://maps.google.com/?q=${input.lat},${input.lng}`
    : "";
  const body =
    `HANAPGAWA SOS: Nag-emergency alert si ${user.firstName} ${user.lastName}${where}. ` +
    `Pakitawagan agad sa ${user.phone}.${place} Kung delikado, tumawag sa 911.`;

  let reached = 0;
  const sms = smsSender();
  for (const contact of user.trustedContacts) {
    try {
      await sms.send(contact.phone, body);
      reached++;
    } catch (e) {
      console.error("SOS contact SMS failed", contact.id, e);
    }
  }
  if (reached > 0) {
    await db.sosAlert.update({ where: { id: alert.id }, data: { alertedContacts: reached } });
  }

  // 3. Tell the counterparty someone pressed it — often enough to defuse.
  if (counterpartyId) {
    await notify({
      userId: counterpartyId,
      type: "SOS_RAISED",
      title: "🚨 May nag-emergency alert",
      body: "Nag-SOS ang kasama mo sa trabahong ito. Nakikipag-ugnayan na ang support team.",
      href: jobId ? `/jobs/${jobId}` : undefined,
      jobId,
    });
  }

  // 4. Page every admin.
  const admins = await db.user.findMany({ where: { isAdmin: true }, select: { id: true } });
  for (const a of admins) {
    await notify({
      userId: a.id,
      type: "SOS_RAISED",
      title: "🚨 SOS — kailangan ng agarang aksyon",
      body: `${user.firstName} ${user.lastName} (${user.phone})${jobTitle ? ` — "${jobTitle}"` : ""}`,
      href: "/admin?tab=sos",
      jobId,
    });
  }

  return { alert, contactsReached: reached, totalContacts: user.trustedContacts.length };
}

export async function resolveSos(
  alertId: string,
  handlerId: string,
  status: "ACKNOWLEDGED" | "RESOLVED",
  resolution?: string,
) {
  const alert = await db.sosAlert.findUnique({ where: { id: alertId } });
  if (!alert) throw new ApiError(404, "Alert not found");
  if (alert.status === "RESOLVED") throw new ApiError(409, "Alert already resolved");

  const updated = await db.sosAlert.update({
    where: { id: alertId },
    data: {
      status,
      handlerId,
      resolution,
      resolvedAt: status === "RESOLVED" ? new Date() : null,
    },
  });

  if (status === "RESOLVED") {
    await notify({
      userId: alert.userId,
      type: "SOS_RESOLVED",
      title: "Naisara na ang SOS mo",
      body: resolution || "Nakipag-ugnayan na ang support team. Salamat sa pag-report.",
    });
  }
  return updated;
}

/** Provider (or client) marks arrival/departure on an active booking. */
export async function recordCheckIn(
  jobId: string,
  userId: string,
  kind: "ARRIVED" | "LEFT",
  coords?: { lat?: number; lng?: number },
  note?: string,
) {
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job) throw new ApiError(404, "Job not found");
  if (job.clientId !== userId && job.assignedProviderId !== userId) {
    throw new ApiError(403, "Not your job");
  }
  if (!ACTIVE_JOB_STATES.includes(job.status)) {
    throw new ApiError(409, "This job is not active");
  }

  const entry = await db.jobCheckIn.create({
    data: { jobId, userId, kind, lat: coords?.lat, lng: coords?.lng, note },
  });

  const actor = await db.user.findUnique({ where: { id: userId }, select: { firstName: true } });
  const other = job.clientId === userId ? job.assignedProviderId : job.clientId;
  if (other) {
    await notify({
      userId: other,
      type: kind === "ARRIVED" ? "CHECKED_IN" : "CHECKED_OUT",
      title: kind === "ARRIVED" ? "Dumating na 📍" : "Umalis na 👋",
      body:
        kind === "ARRIVED"
          ? `Nandiyan na si ${actor?.firstName ?? "ang kasama mo"} para sa "${job.title}".`
          : `Tapos na ang oras ni ${actor?.firstName ?? "ang kasama mo"} sa "${job.title}".`,
      href: `/jobs/${jobId}`,
      jobId,
    });
  }

  return entry;
}
