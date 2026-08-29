import { verifyStatement } from "@/lib/earnings";

export const dynamic = "force-dynamic";

// Statements are reachable only by their unguessable code — search engines
// must never turn someone's income into a query result.
export const metadata = { robots: { index: false, follow: false } };

// The page a loan officer, landlord, or embassy clerk sees when they enter
// the code a provider handed them. It must read as a document, not an app:
// no navigation into the product, no marketing, nothing to tap — just the
// attestation, printable as-is. Server-rendered so it works on the oldest
// browser in the barangay hall.

const peso = (cents: number) => `₱${Math.round(cents / 100).toLocaleString("en-PH")}`;
const day = (d: Date) =>
  d.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Manila" });
const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("en-PH", { month: "short", year: "numeric" });
};
const KYC_LABEL: Record<number, string> = {
  1: "Phone verified",
  2: "Government ID verified",
  3: "Fully vetted (ID + clearance)",
};

export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const stmt = await verifyStatement(decodeURIComponent(code));

  if (!stmt) {
    return (
      <div className="mx-auto max-w-lg py-10">
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6 text-center">
          <div className="text-4xl">✕</div>
          <h1 className="mt-2 text-xl font-bold text-red-800">This code is not valid</h1>
          <p className="text-sm font-semibold text-red-800">Hindi valid ang code na ito</p>
          <p className="mt-2 text-sm text-red-900">
            No active Patunay ng Kita statement matches that code. It may be mistyped, past its 90-day
            validity, or revoked by its owner. Ask the person who gave it to you to generate a new one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 py-6 print:py-0">
      <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4 text-center">
        <div className="text-3xl">✓</div>
        <h1 className="text-xl font-bold text-emerald-900">Verified Proof of Income</h1>
        <p className="text-sm font-semibold text-emerald-900">Patunay ng Kita</p>
        <p className="mt-1 text-xs text-emerald-800">
          This document is issued by HanapGawa and attested by our payment records. Ang dokumentong ito ay
          galing mismo sa HanapGawa at pinatutunayan ng aming record ng bayaran.
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Name / Pangalan</dt>
            <dd className="text-right font-bold">{stmt.providerName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Verification</dt>
            <dd className="text-right font-semibold">{KYC_LABEL[stmt.kycLevel] ?? "Registered"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Member since</dt>
            <dd className="text-right">{day(stmt.memberSince)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Period covered</dt>
            <dd className="text-right">{day(stmt.periodFrom)} – {day(stmt.periodTo)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-stone-100 pt-3">
            <dt className="font-semibold text-gray-700">Total platform earnings / Kabuuang kita</dt>
            <dd className="text-right text-2xl font-bold text-brand-800">{peso(stmt.totalPayoutCents)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Completed jobs / Natapos na trabaho</dt>
            <dd className="text-right font-bold">{stmt.jobsCount}</dd>
          </div>
        </dl>
      </div>

      {stmt.monthly.length > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="text-sm font-bold text-gray-700">Monthly breakdown / Buwanang detalye</h2>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500">
                <th className="py-1 font-semibold">Month</th>
                <th className="py-1 text-right font-semibold">Jobs</th>
                <th className="py-1 text-right font-semibold">Earnings</th>
              </tr>
            </thead>
            <tbody>
              {stmt.monthly.map((m) => (
                <tr key={m.month} className="border-t border-stone-100">
                  <td className="py-1.5">{monthLabel(m.month)}</td>
                  <td className="py-1.5 text-right">{m.jobs}</td>
                  <td className="py-1.5 text-right font-semibold">{peso(m.payoutCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-2xl bg-stone-100 p-4 text-xs text-gray-600">
        <p>
          <strong>How to read this:</strong> The amount above is what was actually paid to the provider
          through HanapGawa&apos;s escrow for completed, confirmed jobs — not an estimate, not a budget, but money
          that really moved. Earnings outside the platform are not included. <em>Ang halagang nasa itaas ay ang
          aktwal na naibayad sa provider para sa mga natapos at kinumpirmang trabaho.</em>
        </p>
        <p className="mt-2">
          Statement code <span className="font-mono font-bold">{stmt.code}</span> · issued {day(stmt.createdAt)} ·
          valid until {day(stmt.expiresAt)}. To re-confirm, open this same link — if this page still appears,
          the document is still valid.
        </p>
      </div>
    </div>
  );
}
