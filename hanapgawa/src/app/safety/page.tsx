import { Card } from "@/components/ui";

export const metadata = { title: "Safety & Privacy — HanapGawa" };

export default function SafetyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-extrabold">Safety at Privacy 🛡️</h1>
      <p className="text-sm text-gray-600">
        Ang HanapGawa ay ginawa para protektahan ang <strong>provider</strong> (ang gumagawa ng trabaho) at ang{" "}
        <strong>client</strong> (ang nagpapagawa) — pareho kayo.
      </p>

      <Card>
        <h2 className="font-bold">✔ Verification ladder</h2>
        <ul className="mt-2 list-inside space-y-2 text-sm text-gray-700">
          <li><strong>Level 1 — Phone Verified.</strong> OTP sa totoong PH number (rehistrado sa SIM Registration Act). Kailangan para maka-post o maka-offer.</li>
          <li><strong>Level 2 — ID Verified.</strong> PhilSys / Driver&apos;s License / UMID / Passport. Kailangan sa jobs na ₱2,000 pataas.</li>
          <li><strong>Level 3 — Fully Vetted.</strong> NBI o Police Clearance. Makukuha ang pinaka-prominenteng badge — mas pinipili ng clients.</li>
        </ul>
        <p className="mt-2 text-xs text-gray-500">Parehong pwedeng mag-verify ang clients at providers. Ang badge ng client ay nakikita rin ng providers — dalawang direksyon ang tiwala.</p>
      </Card>

      <Card>
        <h2 className="font-bold">💰 Escrow — walang unahan ng bayad</h2>
        <p className="mt-2 text-sm text-gray-700">
          Kapag tinanggap ng client ang offer mo, ang bayad ay <strong>hawak muna ng platform</strong>. Hindi ito makukuha ng
          client pabalik nang basta-basta, at hindi rin ito mapupunta sa provider hangga&apos;t hindi kumpirmado na tapos ang
          trabaho. Kapag may hindi pagkakasunduan, may <strong>dispute process</strong> na tao ang nag-aayos, hindi makina.
        </p>
      </Card>

      <Card>
        <h2 className="font-bold">💬 Bakit bawal ang usapan sa labas ng app?</h2>
        <p className="mt-2 text-sm text-gray-700">
          Awtomatikong tinatakpan ng system ang mga phone number, email, at social media handle sa chat. Hindi ito para
          maging mahigpit — ito ang proteksyon ninyo:
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-700">
          <li>Kapag lumabas kayo ng app, <strong>wala nang escrow</strong> — kung hindi magbayad ang client o hindi sumipot ang provider, wala kaming maitutulong.</li>
          <li>Ang chat record ang ebidensya kapag may dispute.</li>
          <li>Karamihan ng scam sa Facebook hiring groups ay nagsisimula sa &ldquo;PM mo ko sa Viber.&rdquo;</li>
        </ul>
      </Card>

      <Card>
        <h2 className="font-bold">🔒 Data Privacy (RA 10173)</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-700">
          <li>Hindi namin ipinapakita ang buong pangalan, number, o address mo sa publiko.</li>
          <li>Ang exact address ng trabaho ay makikita lang ng provider na na-book — hindi ng lahat.</li>
          <li>Hindi namin sine-save ang buong ID number mo — last 4 digits lang.</li>
          <li>May karapatan kang malaman, itama, at ipabura ang data mo. Mag-email sa privacy officer namin anumang oras.</li>
          <li>Hindi namin ibinebenta ang data mo. Hinding-hindi.</li>
        </ul>
      </Card>

      <Card>
        <h2 className="font-bold">🚨 Kapag may masama nang nangyayari</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-700">
          <li>Gamitin ang <strong>Report</strong> button sa profile o job page.</li>
          <li>Sa emergency, tumawag sa <strong>911</strong>. Ang safety mo ang una, hindi ang app.</li>
          <li>I-share sa kapamilya ang detalye ng trabaho bago pumunta — makikita mo ang buong job record sa app.</li>
          <li>Sa unang trabaho sa bagong tao, piliin ang pampublikong lugar kung kaya (hal. laundry drop-off).</li>
        </ul>
      </Card>
    </div>
  );
}
