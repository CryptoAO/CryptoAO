import { verifyStatement } from "@/lib/earnings";

export const dynamic = "force-dynamic";

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
          <h1 className="mt-2 text-xl font-extrabold text-red-800">Hindi valid ang code na ito</h1>
          <p className="mt-2 text-sm text-red-900">
            Walang aktibong Patunay ng Kita sa code na iyan. Maaaring mali ang pagkaka-type, lampas na ang
            90 araw, o binawi na ito ng may-ari. Hilingin sa nagbigay na gumawa ng bago.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 py-6 print:py-0">
      <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4 text-center">
        <div className="text-3xl">✓</div>
        <h1 className="text-xl font-extrabold text-emerald-900">Verified na Patunay ng Kita</h1>
        <p className="mt-1 text-xs text-emerald-800">
          Ang dokumentong ito ay galing mismo sa HanapGawa at pinatutunayan ng aming record ng bayaran.
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Pangalan</dt>
            <dd className="text-right font-bold">{stmt.providerName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Beripikasyon</dt>
            <dd className="text-right font-semibold">{KYC_LABEL[stmt.kycLevel] ?? "Registered"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Miyembro simula</dt>
            <dd className="text-right">{day(stmt.memberSince)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Saklaw na panahon</dt>
            <dd className="text-right">{day(stmt.periodFrom)} – {day(stmt.periodTo)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-stone-100 pt-3">
            <dt className="font-semibold text-gray-700">Kabuuang kita sa platform</dt>
            <dd className="text-right text-2xl font-extrabold text-brand-800">{peso(stmt.totalPayoutCents)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Bilang ng natapos na trabaho</dt>
            <dd className="text-right font-bold">{stmt.jobsCount}</dd>
          </div>
        </dl>
      </div>

      {stmt.monthly.length > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="text-sm font-bold text-gray-700">Buwanang detalye</h2>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500">
                <th className="py-1 font-semibold">Buwan</th>
                <th className="py-1 text-right font-semibold">Trabaho</th>
                <th className="py-1 text-right font-semibold">Kita</th>
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
          <strong>Paano basahin:</strong> Ang halagang nasa itaas ay ang aktwal na naibayad sa provider sa
          pamamagitan ng escrow ng HanapGawa para sa mga natapos at kinumpirmang trabaho — hindi tantiya,
          hindi budget, kundi perang tunay na lumipat. Hindi kasama rito ang kita sa labas ng platform.
        </p>
        <p className="mt-2">
          Statement code <span className="font-mono font-bold">{stmt.code}</span> · ginawa {day(stmt.createdAt)} ·
          valid hanggang {day(stmt.expiresAt)}. Kung kailangan ng kumpirmasyon, buksan ang parehong link na ito —
          kung lumalabas pa rin ang pahinang ito, valid pa ang dokumento.
        </p>
      </div>
    </div>
  );
}
