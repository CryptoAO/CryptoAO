// Data subject rights, implemented rather than promised.
//
// The privacy notice tells people they can see their data, take a copy of
// it, and have it erased. A notice that routes all three through an email
// address is legally sufficient and practically hollow — the founder
// becomes the bottleneck, and most people never bother. So both are here,
// in the app, for free, with no ticket.
//
// Erasure is the interesting half. A hard delete is the wrong shape:
//
//   - Ledger rows are financial records. Deleting them would corrupt the
//     platform's own books and break the audit trail behind every payout.
//     The schema already refuses (onDelete: Restrict).
//   - Reviews someone wrote are part of ANOTHER person's reputation. Wiping
//     them silently re-rates providers who did nothing wrong.
//   - Chat is a shared record. The counterparty has a legitimate interest
//     in the conversation about a job they were part of.
//
// So closing an account anonymises the person in place: every direct
// identifier is destroyed and the account can never be logged into again,
// while the rows that belong to other people or to the books survive with
// an unnamed author. That is what "erasure, unless we are legally obliged
// to keep it" means in practice, and it is what the notice already says.

import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db, moneyTxOptions } from "./db";
import { objectStore } from "./storage";
import { walletBalanceCents } from "./wallet";

type Tx = Prisma.TransactionClient | typeof db;

/** Job states where somebody is still owed work, money, or an answer. */
export const OPEN_COMMITMENT_STATES = ["OPEN", "BOOKED", "IN_PROGRESS", "DONE_BY_PROVIDER", "DISPUTED"];

export interface ClosureBlocker {
  code: "ACTIVE_JOBS" | "WALLET_BALANCE" | "PENDING_PAYOUT";
  message: string;
}

export interface ClosureCheck {
  canClose: boolean;
  blockers: ClosureBlocker[];
}

interface ClosureFacts {
  activeJobs: number;
  balanceCents: number;
  pendingPayouts: number;
}

/**
 * Pure so the rules are testable and the copy lives in one place. Every
 * blocker names something the person can actually go and resolve — "you
 * cannot delete your account" with no reason is how you get an angry
 * message instead of a cashed-out wallet.
 */
export function closureBlockers(facts: ClosureFacts): ClosureCheck {
  const blockers: ClosureBlocker[] = [];

  if (facts.activeJobs > 0) {
    blockers.push({
      code: "ACTIVE_JOBS",
      message:
        facts.activeJobs === 1
          ? "May 1 trabaho kang hindi pa tapos. Tapusin o kanselahin muna ito."
          : `May ${facts.activeJobs} trabaho kang hindi pa tapos. Tapusin o kanselahin muna ang mga ito.`,
    });
  }

  if (facts.balanceCents > 0) {
    blockers.push({
      code: "WALLET_BALANCE",
      message: `May natitira kang ₱${(facts.balanceCents / 100).toLocaleString("en-PH")} sa wallet. I-cash out muna — hindi namin kukunin ang pera mo.`,
    });
  }

  if (facts.pendingPayouts > 0) {
    blockers.push({
      code: "PENDING_PAYOUT",
      message: "May cash-out kang hinihintay pa. Hintayin munang matapos ito.",
    });
  }

  return { canClose: blockers.length === 0, blockers };
}

export async function checkClosure(userId: string, tx: Tx = db): Promise<ClosureCheck> {
  const [activeAsClient, activeAsProvider, balanceCents, pendingPayouts] = await Promise.all([
    tx.job.count({ where: { clientId: userId, status: { in: OPEN_COMMITMENT_STATES } } }),
    tx.job.count({ where: { assignedProviderId: userId, status: { in: OPEN_COMMITMENT_STATES } } }),
    walletBalanceCents(userId, tx),
    tx.payoutRequest.count({ where: { userId, status: "PENDING" } }),
  ]);

  return closureBlockers({
    activeJobs: activeAsClient + activeAsProvider,
    balanceCents,
    pendingPayouts,
  });
}

/**
 * Everything we hold about one person, in one JSON document.
 *
 * Two deliberate omissions. Identity-document *images* are never included:
 * re-emitting a scan of somebody's driver's licence over HTTP, to whoever
 * happens to be holding their session, would create exactly the exposure
 * the upload pipeline exists to prevent — the submission's status and dates
 * are here instead. And messages are the sender's own text only; the
 * counterparty's half of a conversation is their data, not this user's.
 */
export async function exportAccount(userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });

  const [
    jobsPosted, jobsWorked, offers, messages, reviewsGiven, reviewsReceived,
    ledger, payouts, kyc, contacts, notifications, checkIns, providerCategories, availability,
  ] = await Promise.all([
    db.job.findMany({ where: { clientId: userId }, orderBy: { createdAt: "desc" } }),
    db.job.findMany({ where: { assignedProviderId: userId }, orderBy: { createdAt: "desc" } }),
    db.offer.findMany({ where: { providerId: userId }, orderBy: { createdAt: "desc" } }),
    db.message.findMany({ where: { senderId: userId }, orderBy: { createdAt: "desc" } }),
    db.review.findMany({ where: { raterId: userId }, orderBy: { createdAt: "desc" } }),
    db.review.findMany({ where: { rateeId: userId }, orderBy: { createdAt: "desc" } }),
    db.ledgerEntry.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    db.payoutRequest.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    db.kycSubmission.findMany({
      where: { userId },
      // Never the image, never its storage key.
      select: { id: true, level: true, status: true, docType: true, idLastFour: true, notes: true, createdAt: true, reviewedAt: true, docPurgedAt: true },
      orderBy: { createdAt: "desc" },
    }),
    db.trustedContact.findMany({ where: { userId } }),
    db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 500 }),
    db.jobCheckIn.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    db.providerCategory.findMany({ where: { providerId: userId } }),
    db.availabilitySlot.findMany({ where: { providerId: userId } }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    notice:
      "Ito ang lahat ng data na hawak namin tungkol sa'yo. Hindi kasama ang larawan ng ID mo — hindi namin ipinapadala iyon sa kahit anong link.",
    profile: {
      id: user.id,
      phone: user.phone,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      bio: user.bio,
      regionCode: user.regionCode,
      cityCode: user.cityCode,
      barangay: user.barangay,
      isClient: user.isClient,
      isProvider: user.isProvider,
      kycLevel: user.kycLevel,
      status: user.status,
      strikeCount: user.strikeCount,
      notifyNewJobs: user.notifyNewJobs,
      createdAt: user.createdAt,
    },
    jobsPosted,
    jobsWorked,
    offers,
    messagesSent: messages,
    reviewsGiven,
    reviewsReceived,
    wallet: { ledger, payoutRequests: payouts },
    identityVerification: kyc,
    trustedContacts: contacts,
    notifications,
    checkIns,
    providerProfile: { categories: providerCategories, availability },
  };
}

export interface ClosureResult {
  closed: true;
  removed: Record<string, number>;
}

/**
 * Close an account by anonymising it. Irreversible on purpose: there is no
 * "undelete" that would quietly resurrect somebody's name.
 */
export async function closeAccount(userId: string): Promise<ClosureResult> {
  // Any image of this person still on disk has to go with the account: a
  // PENDING identity document (a decided one was purged at decision time)
  // and their profile photo. Deleting only the rows would leave a scan of
  // somebody's licence, or a picture of their face, orphaned in the store
  // forever — the exact opposite of what closing an account means.
  //
  // Done before the transaction on purpose: file deletes cannot be rolled
  // back, so the ordering that fails safe is "bytes first, row second". A
  // crash in between leaves a row pointing at a missing file, which reads as
  // already-purged; the reverse would leave a file nothing points at.
  const [pendingDocs, self] = await Promise.all([
    db.kycSubmission.findMany({
      where: { userId, docRef: { not: null }, docPurgedAt: null },
      select: { docRef: true },
    }),
    db.user.findUnique({ where: { id: userId }, select: { photoKey: true } }),
  ]);
  const orphanKeys = [...pendingDocs.map((d) => d.docRef!), ...(self?.photoKey ? [self.photoKey] : [])];
  if (orphanKeys.length > 0) {
    const store = objectStore();
    for (const key of orphanKeys) {
      await store.remove(key).catch(() => {
        // A missing file is the desired end state anyway.
      });
    }
  }

  return db.$transaction(async (tx) => {
    // Re-checked INSIDE the transaction, not just before it. Between an
    // outside check and this write, an offer could be accepted or a cash-out
    // filed — and closing over a live booking would strand a counterparty
    // with an anonymous no-show. On Postgres the Serializable isolation in
    // moneyTxOptions makes that window disappear entirely.
    const check = await checkClosure(userId, tx);
    if (!check.canClose) {
      throw new Error(check.blockers.map((b) => b.message).join(" "));
    }

    // Rows that are purely this person's and serve no one else once they
    // are gone. Trusted contacts in particular are OTHER people's phone
    // numbers, given to us for one purpose that has now ended.
    const [contacts, notifications, kyc, categories, availability] = await Promise.all([
      tx.trustedContact.deleteMany({ where: { userId } }),
      tx.notification.deleteMany({ where: { userId } }),
      tx.kycSubmission.deleteMany({ where: { userId } }),
      tx.providerCategory.deleteMany({ where: { providerId: userId } }),
      tx.availabilitySlot.deleteMany({ where: { providerId: userId } }),
    ]);

    // The phone column is unique, so it needs a value no real number can
    // collide with and normalizePhPhone can never produce.
    await tx.user.update({
      where: { id: userId },
      data: {
        phone: `deleted:${userId}`,
        email: null,
        // Random, unusable, and never given out: the account cannot be
        // logged into again even by whoever knew the old password.
        passwordHash: randomBytes(32).toString("hex"),
        firstName: "Dating",
        lastName: "user",
        photoKey: null,
        photoMime: null,
        totpSecret: null,
        totpEnabledAt: null,
        bio: null,
        barangay: null,
        lat: null,
        lng: null,
        isProvider: false,
        notifyNewJobs: false,
        status: "DELETED",
        // Revokes every session already issued.
        tokenVersion: { increment: 1 },
      },
    });

    return {
      closed: true as const,
      removed: {
        trustedContacts: contacts.count,
        notifications: notifications.count,
        identitySubmissions: kyc.count,
        providerCategories: categories.count,
        availabilitySlots: availability.count,
      },
    };
  }, moneyTxOptions);
}
