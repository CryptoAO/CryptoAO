import { cookies } from "next/headers";
import { Card } from "@/components/ui";
import { LANG_COOKIE, normalizeLang, tr } from "@/lib/i18n-shared";
import { IconAlertTriangle, IconChat, IconLock, IconShieldCheck, IconWallet } from "@/components/icons";

export const metadata = { title: "Safety & Privacy — HanapGawa" };

function H({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <h2 className="flex items-center gap-2 font-bold"><span className="text-brand-700">{icon}</span> {children}</h2>;
}

export default async function SafetyPage() {
  const lang = normalizeLang((await cookies()).get(LANG_COOKIE)?.value);
  const t = (tl: string, en: string) => tr(lang, tl, en);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">{t("Safety at Privacy", "Safety & Privacy")}</h1>
      <p className="text-sm text-gray-600">
        {t("Ang HanapGawa ay ginawa para protektahan ang", "HanapGawa is built to protect the")} <strong>provider</strong>{" "}
        {t("(ang gumagawa ng trabaho) at ang", "(the one doing the work) and the")} <strong>client</strong>{" "}
        {t("(ang nagpapagawa) — pareho kayo.", "(the one hiring) — both of you.")}
      </p>

      <Card>
        <H icon={<IconShieldCheck size={18} />}>Verification ladder</H>
        <ul className="mt-2 list-inside space-y-2 text-sm text-gray-700">
          <li><strong>Level 1 — Phone Verified.</strong> {t("OTP sa totoong PH number (rehistrado sa SIM Registration Act). Kailangan para maka-post o maka-offer.", "OTP to a real PH number (registered under the SIM Registration Act). Required to post or make offers.")}</li>
          <li><strong>Level 2 — ID Verified.</strong> {t("PhilSys / Driver's License / UMID / Passport. Kailangan sa jobs na ₱2,000 pataas.", "PhilSys / Driver's License / UMID / Passport. Required for jobs of ₱2,000 and up.")}</li>
          <li><strong>Level 3 — Fully Vetted.</strong> {t("NBI o Police Clearance. Makukuha ang pinaka-prominenteng badge — mas pinipili ng clients.", "NBI or Police Clearance. Earns the most prominent badge — clients pick it more.")}</li>
        </ul>
        <p className="mt-2 text-xs text-gray-500">{t("Parehong pwedeng mag-verify ang clients at providers. Ang badge ng client ay nakikita rin ng providers — dalawang direksyon ang tiwala.", "Both clients and providers can verify. A client's badge is visible to providers too — trust runs both ways.")}</p>
      </Card>

      <Card>
        <H icon={<IconWallet size={18} />}>{t("Escrow — walang unahan ng bayad", "Escrow — nobody pays first")}</H>
        <p className="mt-2 text-sm text-gray-700">
          {t("Kapag tinanggap ng client ang offer mo, ang bayad ay", "When a client accepts your offer, the payment is")}{" "}
          <strong>{t("hawak muna ng platform", "held by the platform")}</strong>.{" "}
          {t("Hindi ito makukuha ng client pabalik nang basta-basta, at hindi rin ito mapupunta sa provider hangga't hindi kumpirmado na tapos ang trabaho. Kapag may hindi pagkakasunduan, may", "The client cannot simply take it back, and the provider does not receive it until the work is confirmed done. When there is a disagreement, a")}{" "}
          <strong>dispute process</strong> {t("na tao ang nag-aayos, hindi makina.", "resolved by a person, not a machine, takes over.")}
        </p>
      </Card>

      <Card>
        <H icon={<IconChat size={18} />}>{t("Bakit bawal ang usapan sa labas ng app?", "Why must conversations stay in the app?")}</H>
        <p className="mt-2 text-sm text-gray-700">
          {t("Awtomatikong tinatakpan ng system ang mga phone number, email, at social media handle sa chat. Hindi ito para maging mahigpit — ito ang proteksyon ninyo:", "The system automatically masks phone numbers, emails, and social handles in chat. Not to be strict — it is your protection:")}
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-700">
          <li>{t("Kapag lumabas kayo ng app,", "Once you take it off-app,")} <strong>{t("wala nang escrow", "there is no escrow")}</strong> — {t("kung hindi magbayad ang client o hindi sumipot ang provider, wala kaming maitutulong.", "if the client doesn't pay or the provider doesn't show, we can't help.")}</li>
          <li>{t("Ang chat record ang ebidensya kapag may dispute.", "The chat record is the evidence in a dispute.")}</li>
          <li>{t("Karamihan ng scam sa Facebook hiring groups ay nagsisimula sa “PM mo ko sa Viber.”", "Most scams in Facebook hiring groups start with “PM me on Viber.”")}</li>
        </ul>
      </Card>

      <Card>
        <H icon={<IconLock size={18} />}>Data Privacy (RA 10173)</H>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-700">
          <li>{t("Hindi namin ipinapakita ang buong pangalan, number, o address mo sa publiko.", "We never show your full name, number, or address to the public.")}</li>
          <li>{t("Ang exact address ng trabaho ay makikita lang ng provider na na-book — hindi ng lahat.", "The job's exact address is visible only to the booked provider — never to everyone.")}</li>
          <li>{t("Hindi namin sine-save ang buong ID number mo — last 4 digits lang.", "We never store your full ID number — only the last 4 digits.")}</li>
          <li>{t("May karapatan kang malaman, itama, at ipabura ang data mo. Mag-email sa privacy officer namin anumang oras.", "You have the right to see, correct, and erase your data. Email our privacy officer anytime.")}</li>
          <li>{t("Hindi namin ibinebenta ang data mo. Hinding-hindi.", "We do not sell your data. Ever.")}</li>
        </ul>
      </Card>

      <Card>
        <H icon={<IconAlertTriangle size={18} />}>{t("Kapag may masama nang nangyayari", "If something goes wrong")}</H>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-700">
          <li>{t("Gamitin ang", "Use the")} <strong>Report</strong> {t("button sa profile o job page.", "button on any profile or job page.")}</li>
          <li>{t("Sa emergency, tumawag sa", "In an emergency, call")} <strong>911</strong>. {t("Ang safety mo ang una, hindi ang app.", "Your safety comes first, not the app.")}</li>
          <li>{t("I-share sa kapamilya ang detalye ng trabaho bago pumunta — makikita mo ang buong job record sa app.", "Share the job details with family before you go — the full job record is in the app.")}</li>
          <li>{t("Sa unang trabaho sa bagong tao, piliin ang pampublikong lugar kung kaya (hal. laundry drop-off).", "For a first job with someone new, choose a public place when possible (e.g. a laundry drop-off).")}</li>
        </ul>
      </Card>
    </div>
  );
}
