// All money is stored as integer centavos (PHP * 100) — never floats.

export const PLATFORM_DEFAULT_TAKE_RATE_BPS = 1200; // 12%

// Jobs at or above this value require an ID-verified provider (KYC L2).
export const HIGH_VALUE_CENTS = 200_000; // ₱2,000

/** Split an agreed job price into platform commission and provider payout. */
export function splitCommission(amountCents: number, takeRateBps: number) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error("amountCents must be a positive integer");
  }
  if (!Number.isInteger(takeRateBps) || takeRateBps < 0 || takeRateBps > 3000) {
    // hard ceiling of 30% protects providers from a misconfigured category
    throw new Error("takeRateBps out of range 0..3000");
  }
  const commissionCents = Math.round((amountCents * takeRateBps) / 10000);
  return { commissionCents, payoutCents: amountCents - commissionCents };
}

export function formatPhp(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100).toLocaleString("en-PH");
  const frac = abs % 100;
  return frac === 0 ? `₱${sign}${whole}` : `₱${sign}${whole}.${String(frac).padStart(2, "0")}`;
}

export function parsePhpToCents(input: string | number): number {
  const n = typeof input === "number" ? input : Number(String(input).replace(/[₱,\s]/g, ""));
  if (!Number.isFinite(n) || n < 0) throw new Error("Invalid amount");
  return Math.round(n * 100);
}
