import { cookies } from "next/headers";
import Link from "next/link";
import { Card } from "@/components/ui";
import { LANG_COOKIE, normalizeLang, tr } from "@/lib/i18n-shared";

export const metadata = { title: "Help & FAQ — HanapGawa" };

interface Qa { q: [string, string]; a: [string, string] }

const SECTIONS: { title: [string, string]; items: Qa[] }[] = [
  {
    title: ["Account", "Account"],
    items: [
      {
        q: ["Paano gumawa ng account?", "How do I create an account?"],
        a: [
          "Cellphone number lang ang kailangan — walang email. Magpapadala kami ng 6-digit code para i-verify na sa'yo ang number. Libre ito.",
          "All you need is a mobile number — no email. We text a 6-digit code to verify the number is yours. It's free.",
        ],
      },
      {
        q: ["Hindi dumating ang OTP code ko.", "My OTP code didn't arrive."],
        a: [
          "Pindutin ang \"Magpadala ulit ng code\". Kung paulit-ulit itong hindi dumarating, siguraduhing aktibo ang SIM mo at tama ang number na inilagay.",
          "Tap \"Resend the code\". If it repeatedly fails to arrive, check that your SIM is active and the number you entered is correct.",
        ],
      },
      {
        q: ["Nakalimutan ko ang password ko.", "I forgot my password."],
        a: [
          "Sa login page, pindutin ang \"Nakalimutan ang password?\". Magpapadala kami ng code sa number mo para makagawa ka ng bago. Ma-lo-log out ang lahat ng device pagkatapos — proteksyon 'yan, hindi aberya.",
          "On the login page, tap \"Forgot your password?\". We'll text a code so you can set a new one. Every device gets signed out afterwards — that's protection, not a glitch.",
        ],
      },
    ],
  },
  {
    title: ["Trabaho at booking", "Jobs and bookings"],
    items: [
      {
        q: ["Magkano magpa-post ng trabaho?", "How much does posting a job cost?"],
        a: [
          "Libre. Ang platform ay kumikita lang sa maliit na porsyento kapag NATAPOS ang trabaho — kaya kapareho namin kayo ng gusto: matapos ito nang maayos.",
          "Free. The platform only earns a small percentage when a job is COMPLETED — so we want exactly what you want: for the work to finish well.",
        ],
      },
      {
        q: ["Ano ang pagkakaiba ng post at direktang booking?", "What's the difference between posting and direct booking?"],
        a: [
          "Ang post ay nakikita ng lahat ng provider sa lugar mo at sila ang mag-o-offer. Ang direktang booking ay para sa isang provider lang — siya lang ang makakakita, at kapag kinumpirma niya, booked agad.",
          "A post is visible to every provider in your area and they make offers. A direct booking goes to one provider only — only they see it, and once they confirm, it's booked immediately.",
        ],
      },
      {
        q: ["Bakit hindi ako makapag-book sa isang oras?", "Why can't I book a certain time?"],
        a: [
          "May booking na ang provider sa oras na iyon, o nasa labas ito ng oras na sinabi niyang available siya. Piliin ang ibang oras o ibang provider — makikita mo kung sino ang bakante sa \"Kailan mo kailangan?\".",
          "The provider already has a booking then, or it falls outside their stated hours. Pick another time or another provider — \"When do you need it?\" shows who's free.",
        ],
      },
    ],
  },
  {
    title: ["Bayad at escrow", "Payments and escrow"],
    items: [
      {
        q: ["Paano gumagana ang escrow?", "How does escrow work?"],
        a: [
          "Kapag na-book, ang bayad ay hawak muna ng platform — hindi pa napupunta sa provider, at hindi na rin basta mababawi ng client. Kapag kinumpirma ng client na tapos ang trabaho, saka lang ito ire-release. Walang \"nauna akong nagbayad, hindi na sumipot.\"",
          "When a booking is made, the payment is held by the platform — the provider doesn't have it yet, and the client can't simply pull it back. Only when the client confirms the work is done does it release. No pay-first-then-ghosted.",
        ],
      },
      {
        q: ["Nakalimutan ng client na kumpirmahin. Paano ang bayad ko?", "The client forgot to confirm. What about my pay?"],
        a: [
          "May orasan ito. Kapag minarkahan mong tapos ang trabaho, aabisuhan ang client; kung walang aksyon at walang na-report na problema, awtomatikong ire-release ang bayad mo pagkatapos ng 72 oras. Hindi mahihinto ang kita mo dahil lang nakalimot sila.",
          "There's a clock. When you mark the work done, the client is nudged; if they take no action and report no problem, your payment auto-releases after 72 hours. Your earnings can't be stalled by someone forgetting.",
        ],
      },
      {
        q: ["May problema sa trabaho. Ano ang gagawin ko?", "Something went wrong with a job. What do I do?"],
        a: [
          "Pindutin ang \"May problema? Mag-file ng dispute\" sa job page. Magfi-freeze ang bayad sa escrow at tao — hindi makina — ang mag-aayos. Ang litrato (bago/pagkatapos) at ang chat record sa app ang pinakamalakas mong ebidensya.",
          "Tap \"Something wrong? File a dispute\" on the job page. The payment freezes in escrow and a person — not a machine — resolves it. Your before/after photos and the in-app chat record are your strongest evidence.",
        ],
      },
    ],
  },
  {
    title: ["Kaligtasan", "Safety"],
    items: [
      {
        q: ["Paano ako protektado sa unang trabaho sa taong hindi ko kakilala?", "How am I protected on a first job with a stranger?"],
        a: [
          "Tingnan ang verification badge (phone, ID, NBI clearance) at mga review. Gamitin ang check-in (\"Nandito na ako\") pagdating, at magdagdag ng trusted contact sa Kaligtasan tab — sila ang unang matetext kapag pinindot mo ang SOS. Sa emergency, laging 911 muna.",
          "Check the verification badge (phone, ID, NBI clearance) and reviews. Use check-in (\"I have arrived\") when you get there, and add a trusted contact under the Safety tab — they're the first we text if you press SOS. In an emergency, always call 911 first.",
        ],
      },
      {
        q: ["Bakit tinatakpan ang number sa chat?", "Why are phone numbers masked in chat?"],
        a: [
          "Proteksyon ninyo iyon. Kapag lumipat kayo sa Viber o text, wala nang escrow, wala nang record, at wala na kaming maitutulong kapag may gulo. Ang karamihan ng scam ay nagsisimula sa \"PM mo ko sa labas.\"",
          "That's your protection. Once you move to Viber or text, there's no escrow, no record, and nothing we can do if it goes wrong. Most scams start with \"PM me outside.\"",
        ],
      },
    ],
  },
  {
    title: ["Patunay ng Kita", "Proof of income"],
    items: [
      {
        q: ["Paano ko mapapatunayan sa bangko ang kita ko dito?", "How do I prove my earnings here to a bank?"],
        a: [
          "Sa Wallet tab, gumawa ng Patunay ng Kita statement (huling 3, 6, o 12 buwan). May code itong maibibigay mo sa bangko, landlord, o embassy — bubuksan nila ang link at makikita ang totoo mong kinita dito, galing mismo sa aming payment records. Pwede mo itong bawiin anumang oras, at kusa itong nag-e-expire sa 90 araw.",
          "In the Wallet tab, generate a Patunay ng Kita statement (last 3, 6, or 12 months). It carries a code you hand to a bank, landlord, or embassy — they open the link and see your real earnings here, straight from our payment records. You can revoke it anytime, and it expires on its own after 90 days.",
        ],
      },
    ],
  },
  {
    title: ["Privacy at data", "Privacy and data"],
    items: [
      {
        q: ["Paano ko makukuha o mabubura ang data ko?", "How do I get or delete my data?"],
        a: [
          "Self-service ito, hindi email. Sa ilalim ng account page: \"I-download ang lahat ng data ko\" para sa kumpletong kopya, at \"Isara ang account ko\" para burahin ang pangalan at detalye mo. Karapatan mo ito sa ilalim ng Data Privacy Act (RA 10173).",
          "It's self-service, not an email. At the bottom of your account page: \"Download all my data\" for a complete copy, and \"Close my account\" to erase your name and details. This is your right under the Data Privacy Act (RA 10173).",
        ],
      },
    ],
  },
];

export default async function HelpPage() {
  const lang = normalizeLang((await cookies()).get(LANG_COOKIE)?.value);
  const i = lang === "en" ? 1 : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">{tr(lang, "Tulong at FAQ", "Help & FAQ")}</h1>
      <p className="text-sm text-gray-600">
        {tr(lang,
          "Ang mga pinakakaraniwang tanong — at ang mga sagot na diretso.",
          "The most common questions — answered straight.")}
      </p>

      {SECTIONS.map((s) => (
        <Card key={s.title[0]}>
          <h2 className="font-bold">{s.title[i]}</h2>
          <div className="mt-2 divide-y divide-stone-100">
            {s.items.map((qa) => (
              <details key={qa.q[0]} className="group py-2">
                <summary className="cursor-pointer list-none text-sm font-semibold text-gray-900 marker:content-none">
                  <span className="mr-2 inline-block text-gray-400 transition-transform group-open:rotate-90">›</span>
                  {qa.q[i]}
                </summary>
                <p className="mt-1.5 pl-5 text-sm text-gray-600">{qa.a[i]}</p>
              </details>
            ))}
          </div>
        </Card>
      ))}

      <Card className="text-sm text-gray-600">
        {tr(lang,
          "Hindi nasagot ang tanong mo? Gamitin ang Report button sa anumang profile o job page para sa mga paglabag, ang dispute button para sa problema sa bayaran, at basahin ang ",
          "Question not answered? Use the Report button on any profile or job page for violations, the dispute button for payment problems, and read the ")}
        <Link href="/safety" className="font-semibold text-brand-800 underline">safety guide</Link>
        {tr(lang, " para sa buong gabay sa kaligtasan.", " for the full safety guide.")}
      </Card>
    </div>
  );
}
