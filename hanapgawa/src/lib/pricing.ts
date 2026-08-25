// Price guidance.
//
// The person this app is built for has never hired anyone. Asked what an
// afternoon of ironing is worth, they guess — and a job priced at half the
// going rate simply never gets an offer, which reads to them as "nobody
// wants to work" rather than "I underpaid". Both sides then leave.
//
// So we tell them, and we are honest about where the number comes from:
//
//   1. What people in their own city actually paid for this kind of work,
//      once enough jobs have completed to mean anything.
//   2. Failing that, what people paid nationwide.
//   3. Failing that, a seeded estimate — clearly labelled as an estimate.
//
// Guidance is never a rule. A client may post whatever they like; a low
// budget gets a sentence explaining the likely consequence, not a block.
//
// This module stays free of database imports so the posting form can share
// the same thresholds the server uses — one definition of "too low", not a
// client copy that drifts.

/** Below this many completed jobs, percentiles are noise, not a market. */
export const MIN_SAMPLE = 8;

export type GuidanceSource = "city" | "nationwide" | "estimate";

export interface PriceGuidance {
  lowCents: number;
  highCents: number;
  source: GuidanceSource;
  sampleSize: number;
  note: string | null;
  minCents: number;
}

/**
 * Nearest-rank percentile over an ascending array. Deliberately not an
 * interpolating percentile: with a dozen data points, an interpolated value
 * is false precision, and a real price someone actually paid is easier to
 * defend to a user than an average of two.
 */
export function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) throw new Error("percentile of empty set");
  const rank = Math.ceil((p / 100) * sortedAsc.length);
  return sortedAsc[Math.min(Math.max(rank, 1), sortedAsc.length) - 1];
}

/** Round to the nearest ₱10 — a range of "₱287–₱563" reads as made up. */
export function roundPeso(cents: number): number {
  return Math.round(cents / 1000) * 1000;
}

export type BudgetVerdict = "BELOW_MIN" | "LOW" | "TYPICAL" | "GENEROUS";

/** Pure so the copy and thresholds can be tested without a database. */
export function assessBudget(budgetCents: number, g: PriceGuidance): BudgetVerdict {
  if (budgetCents < g.minCents) return "BELOW_MIN";
  // 15% under the low end is still within haggling distance; below that a
  // provider is being asked to work for meaningfully less than their peers.
  if (budgetCents < g.lowCents * 0.85) return "LOW";
  if (budgetCents > g.highCents) return "GENEROUS";
  return "TYPICAL";
}
