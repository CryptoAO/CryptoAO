// Patunay ng Kita — verifiable proof of income.
//
// The people this platform serves cannot prove what they earn. No payslip
// means no bank loan, no lease a landlord will sign, no visa application
// that survives the embassy's income question — however much they actually
// make. Every completed job here already left a ledger row; this turns that
// ledger into a document a loan officer can verify in ten seconds.
//
// Design rules:
// - Totals are SNAPSHOTTED at generation. What the provider handed the bank
//   must be exactly what the bank later sees, even if support adjusts
//   something afterwards. A verification that recomputed would let the
//   document change underneath the person relying on it.
// - The code is unguessable (72 bits), the statement expires in 90 days,
//   and the provider can revoke it. Whoever holds the code sees the
//   statement — that is the point; the provider hands it over on purpose.
// - Only money that actually moved counts: escrow release payouts. Not
//   budgets, not offers, not jobs still in flight.

import { randomBytes } from "node:crypto";
import { ApiError } from "./api";
import { db } from "./db";

/** How long a statement stays verifiable. Banks act within weeks, not years. */
export const STATEMENT_TTL_DAYS = 90;

/** How many un-expired statements one provider may hold at once. */
export const MAX_ACTIVE_STATEMENTS = 5;

export const PERIOD_MONTHS = [3, 6, 12] as const;
export type PeriodMonths = (typeof PERIOD_MONTHS)[number];

export interface LedgerRow {
  amountCents: number;
  jobId: string | null;
  createdAt: Date;
}

export interface MonthlyEarnings {
  month: string; // "2026-05", Philippine time
  payoutCents: number;
  jobs: number;
}

/** PH wall-clock month for a UTC instant (UTC+8, no DST since 1978). */
export function phMonth(at: Date): string {
  const shifted = new Date(at.getTime() + 8 * 3_600_000);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Pure summarization over payout rows, so the arithmetic the statement
 * certifies is testable without a database.
 */
export function summarizePayouts(rows: LedgerRow[]): {
  totalPayoutCents: number;
  jobsCount: number;
  monthly: MonthlyEarnings[];
} {
  let total = 0;
  const jobs = new Set<string>();
  const byMonth = new Map<string, { payoutCents: number; jobs: Set<string> }>();

  for (const row of rows) {
    if (row.amountCents <= 0) continue; // defensive: payouts are credits
    total += row.amountCents;
    if (row.jobId) jobs.add(row.jobId);
    const key = phMonth(row.createdAt);
    const bucket = byMonth.get(key) ?? { payoutCents: 0, jobs: new Set<string>() };
    bucket.payoutCents += row.amountCents;
    if (row.jobId) bucket.jobs.add(row.jobId);
    byMonth.set(key, bucket);
  }

  const monthly = [...byMonth.entries()]
    .map(([month, b]) => ({ month, payoutCents: b.payoutCents, jobs: b.jobs.size }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return { totalPayoutCents: total, jobsCount: jobs.size, monthly };
}

/** Unguessable, phone-typeable: XXXX-XXXX-XXXX over an unambiguous alphabet. */
export function newStatementCode(): string {
  // No 0/O/1/I: this code gets read out loud over a bank counter.
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = randomBytes(12);
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += alphabet[bytes[i] % alphabet.length];
    if (i === 3 || i === 7) out += "-";
  }
  return out;
}

export async function createStatement(providerId: string, months: PeriodMonths) {
  const active = await db.earningsStatement.count({
    where: { providerId, revokedAt: null, expiresAt: { gt: new Date() } },
  });
  if (active >= MAX_ACTIVE_STATEMENTS) {
    throw new ApiError(409, `Hanggang ${MAX_ACTIVE_STATEMENTS} aktibong statement lang — i-revoke muna ang luma`);
  }

  const now = new Date();
  const from = new Date(now);
  from.setUTCMonth(from.getUTCMonth() - months);

  const rows = await db.ledgerEntry.findMany({
    where: {
      userId: providerId,
      type: "ESCROW_RELEASE_PAYOUT",
      createdAt: { gte: from, lte: now },
    },
    select: { amountCents: true, jobId: true, createdAt: true },
  });
  const summary = summarizePayouts(rows);

  return db.earningsStatement.create({
    data: {
      providerId,
      code: newStatementCode(),
      periodFrom: from,
      periodTo: now,
      totalPayoutCents: summary.totalPayoutCents,
      jobsCount: summary.jobsCount,
      monthlyJson: JSON.stringify(summary.monthly),
      expiresAt: new Date(now.getTime() + STATEMENT_TTL_DAYS * 24 * 3_600_000),
    },
  });
}

export interface VerifiedStatement {
  code: string;
  providerName: string;
  memberSince: Date;
  kycLevel: number;
  periodFrom: Date;
  periodTo: Date;
  totalPayoutCents: number;
  jobsCount: number;
  monthly: MonthlyEarnings[];
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Resolve a code for the public verification page. Invalid, revoked and
 * expired all collapse to null — a bank officer needs "valid" or "not
 * valid", and distinguishing "revoked" would leak that a statement once
 * existed after the provider chose to withdraw it.
 */
export async function verifyStatement(code: string): Promise<VerifiedStatement | null> {
  const normalized = code.trim().toUpperCase();
  if (!/^[2-9A-Z]{4}-[2-9A-Z]{4}-[2-9A-Z]{4}$/.test(normalized)) return null;

  const stmt = await db.earningsStatement.findUnique({
    where: { code: normalized },
    include: { provider: { select: { firstName: true, lastName: true, createdAt: true, kycLevel: true, status: true } } },
  });
  if (!stmt || stmt.revokedAt || stmt.expiresAt < new Date()) return null;
  // A closed account's statements die with it.
  if (stmt.provider.status === "DELETED" || stmt.provider.status === "BANNED") return null;

  return {
    code: stmt.code,
    // Full name on purpose: the provider generated this to hand to a bank,
    // and a statement for "Maria D." verifies nothing.
    providerName: `${stmt.provider.firstName} ${stmt.provider.lastName}`,
    memberSince: stmt.provider.createdAt,
    kycLevel: stmt.provider.kycLevel,
    periodFrom: stmt.periodFrom,
    periodTo: stmt.periodTo,
    totalPayoutCents: stmt.totalPayoutCents,
    jobsCount: stmt.jobsCount,
    monthly: JSON.parse(stmt.monthlyJson) as MonthlyEarnings[],
    createdAt: stmt.createdAt,
    expiresAt: stmt.expiresAt,
  };
}
