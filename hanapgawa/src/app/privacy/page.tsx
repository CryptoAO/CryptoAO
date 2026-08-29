import Link from "next/link";
import { Card } from "@/components/ui";
import { LEGAL_DRAFT } from "@/lib/legal";

export const metadata = {
  title: "Privacy Notice — HanapGawa",
  description: "Anong data ang kinokolekta namin, bakit, at ano ang karapatan mo sa ilalim ng RA 10173.",
};

// Privacy notice built to the Data Privacy Act (RA 10173) and NPC guidance:
// it names the controller, states a lawful basis per purpose, inventories
// what is actually collected, gives retention periods, and lists the data
// subject rights with a working way to exercise them.
//
// The bracketed placeholders are the only things a founder must fill in
// before launch — they need a registered entity and a real DPO contact.

const COLLECTED = [
  {
    what: "Pangalan at cellphone number",
    why: "Para makagawa ng account, ma-verify ka, at makausap ka namin",
    basis: "Kontrata (kailangan para magamit ang serbisyo)",
    keep: "Habang aktibo ang account, at 1 taon pagkatapos mag-close",
  },
  {
    what: "Region, city, barangay",
    why: "Para maipakita ang trabahong malapit sa'yo",
    basis: "Kontrata",
    keep: "Kasabay ng account",
  },
  {
    what: "Exact address ng trabaho",
    why: "Para malaman ng provider na na-book mo kung saan pupunta",
    basis: "Kontrata",
    keep: "2 taon mula sa pagtatapos ng trabaho (para sa dispute at reklamo)",
  },
  {
    what: "Larawan ng ID (PhilSys, lisensya, UMID, pasaporte, NBI/police clearance)",
    why: "Para ma-verify na totoo ang pagkatao mo — proteksyon ito ng lahat",
    basis: "Pahintulot mo, at lehitimong interes sa kaligtasan ng plataporma",
    keep: "BINUBURA AGAD pagkatapos ng review. Ang natitira lang ay ang desisyon, ang uri ng dokumento, at ang huling 4 na digit",
  },
  {
    what: "Mga mensahe sa app",
    why: "Para may record kayong dalawa kapag may hindi pagkakaunawaan",
    basis: "Kontrata at lehitimong interes (pag-iwas sa scam)",
    keep: "2 taon mula sa huling mensahe",
  },
  {
    what: "Mga transaksyon at ledger (cash in, hold, bayad, cash out)",
    why: "Para tumpak ang pera at masunod ang batas sa buwis at accounting",
    basis: "Legal na obligasyon",
    keep: "10 taon (kailangan ng BIR at accounting rules)",
  },
  {
    what: "Lokasyon kapag nag-check in o nag-SOS ka",
    why: "Para malaman kung nasaan ka sa emergency, at may record ng pagdating",
    basis: "Pahintulot mo (pwede mong tanggihan sa browser)",
    keep: "1 taon; ang SOS record ay 3 taon",
  },
  {
    what: "Trusted contacts (pangalan at number ng kapamilya)",
    why: "Para may matawagan kapag nag-SOS ka",
    basis: "Pahintulot mo",
    keep: "Hanggang tanggalin mo, o hanggang mag-close ang account",
  },
  {
    what: "IP address at audit log",
    why: "Para maprotektahan ang account mo laban sa hacking at pandaraya",
    basis: "Lehitimong interes sa seguridad",
    keep: "1 taon",
  },
];

const SHARED = [
  ["Payment processor (hal. PayMongo)", "Para maproseso ang cash in at cash out. Sila ang humahawak ng card at e-wallet details — hindi kami."],
  ["SMS provider (hal. Semaphore)", "Para maipadala ang OTP at SOS alerts."],
  ["Cloud hosting at database", "Para tumakbo ang app at ma-backup ang data."],
  ["Awtoridad (PNP, NBI, korte, NPC)", "Kapag may sapat na legal na basehan — subpoena, court order, o imbestigasyon."],
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Privacy Notice</h1>
        <p className="mt-1 text-sm text-gray-500">
          Huling update: 25 Agosto 2026 · Sakop ng Data Privacy Act of 2012 (RA 10173)
        </p>
      </div>

      {LEGAL_DRAFT && (
        <div className="rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          DRAFT — Wala pang rehistradong kumpanya sa likod ng dokumentong ito. Ang mga nasa [bracket] ay
          pupunan bago ang totoong launch; hanggang doon, wala pang personal information controller na
          maaaring managot sa ilalim ng notice na ito.
        </div>
      )}

      <Card className="border-brand-200 bg-brand-50">
        <h2 className="font-bold text-brand-900">Ang maikling bersyon</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-brand-900">
          <li><strong>Hindi namin binebenta ang data mo.</strong> Kahit kanino, kahit magkano.</li>
          <li>Hindi namin ipinapakita ang number at buong pangalan mo sa publiko.</li>
          <li>Ang exact address ng trabaho ay nakikita lang ng provider na na-book mo.</li>
          <li><strong>Ang larawan ng ID mo ay binubura agad pagkatapos ma-review.</strong> Ang last 4 digits lang ang natitira.</li>
          <li>Pwede mong hingin, itama, o ipabura ang data mo anumang oras.</li>
        </ul>
      </Card>

      <Card>
        <h2 className="font-bold">1. Sino kami</h2>
        <p className="mt-2 text-sm text-gray-700">
          Ang HanapGawa ay pinapatakbo ng <strong>[Pangalan ng kumpanya]</strong>, rehistrado sa SEC/DTI
          na may address sa <strong>[address]</strong>. Kami ang <em>personal information controller</em> ng
          data na nakalista dito.
        </p>
        <p className="mt-2 text-sm text-gray-700">
          Data Protection Officer: <strong>[pangalan]</strong> ·{" "}
          <strong>[email]</strong> · <strong>[number]</strong>
        </p>
      </Card>

      <Card>
        <h2 className="font-bold">2. Anong data, bakit, at gaano katagal</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[42rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left">
                <th className="py-2 pr-3 font-bold">Data</th>
                <th className="py-2 pr-3 font-bold">Bakit</th>
                <th className="py-2 pr-3 font-bold">Basehan sa batas</th>
                <th className="py-2 font-bold">Gaano katagal</th>
              </tr>
            </thead>
            <tbody>
              {COLLECTED.map((row) => (
                <tr key={row.what} className="border-b border-stone-100 align-top">
                  <td className="py-2 pr-3 font-semibold">{row.what}</td>
                  <td className="py-2 pr-3 text-gray-600">{row.why}</td>
                  <td className="py-2 pr-3 text-gray-600">{row.basis}</td>
                  <td className="py-2 text-gray-600">{row.keep}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="font-bold">3. Kanino namin ito ibinabahagi</h2>
        <p className="mt-2 text-sm text-gray-700">
          Sa mga sumusunod lang, at para lang sa nakasaad na dahilan:
        </p>
        <ul className="mt-2 space-y-2 text-sm text-gray-700">
          {SHARED.map(([who, why]) => (
            <li key={who}>
              <strong>{who}</strong> — {why}
            </li>
          ))}
        </ul>
        <p className="mt-3 rounded-xl bg-stone-50 p-3 text-sm text-gray-700">
          Kapag nag-SOS ka, ipapadala namin ang pangalan mo, ang number mo, at ang huling lokasyon mo
          sa mga <strong>trusted contacts na ikaw mismo ang naglagay</strong>, at sa support team namin.
          Ito ang buong punto ng SOS — kaya mag-ingat sa pagpili ng contact.
        </p>
      </Card>

      <Card>
        <h2 className="font-bold">4. Ang mga karapatan mo (Sections 16–18, RA 10173)</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-700">
          <li><strong>Malaman</strong> kung anong data ang hawak namin tungkol sa'yo</li>
          <li><strong>Makita</strong> at makakuha ng kopya nito</li>
          <li><strong>Itama</strong> ang mali o luma</li>
          <li><strong>Ipabura</strong> o i-block ang data (kung hindi kami legal na obligadong itago ito)</li>
          <li><strong>Tumutol</strong> sa ilang paggamit, tulad ng job alerts</li>
          <li><strong>Ilipat</strong> ang data mo sa ibang serbisyo (data portability)</li>
          <li><strong>Magreklamo</strong> sa National Privacy Commission — privacy.gov.ph</li>
          <li><strong>Bayad-pinsala</strong> kung may napatunayang paglabag</li>
        </ul>
        <div className="mt-3 rounded-xl bg-brand-50 p-3 text-sm text-brand-900">
          <p className="font-semibold">Dalawa dito ay pwede mo nang gawin ngayon din, sa app:</p>
          <ul className="mt-1 list-inside list-disc space-y-1">
            <li>
              <strong>I-download ang lahat ng data mo</strong> — isang file, sa{" "}
              <Link href="/me" className="underline">profile mo</Link>. Walang bayad, walang hihintayin.
            </li>
            <li>
              <strong>Isara ang account mo</strong> — nandoon din. Buburahin ang pangalan, number at
              profile mo. Mananatili ang record ng bayaran at ang mga review na isinulat mo tungkol sa
              iba — obligado kami sa batas na itago ang libro, at bahagi na ng reputasyon ng ibang tao
              ang review — pero wala nang pangalan mo.
            </li>
          </ul>
        </div>
        <p className="mt-3 text-sm text-gray-700">
          Para sa iba pang karapatan — pagtatama ng data, pagtutol sa paggamit, o reklamo — mag-email sa
          DPO namin. Sasagot kami sa loob ng <strong>15 araw</strong>. Libre ito — hindi ka namin
          sisingilin para makuha ang sarili mong data.
        </p>
      </Card>

      <Card>
        <h2 className="font-bold">5. Paano namin ito iniingatan</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-700">
          <li>Naka-encrypt ang koneksyon (HTTPS) at hindi kailanman naka-plain text ang password mo</li>
          <li>Ang larawan ng ID ay hindi kailanman nasa pampublikong URL — admin lang, at naka-log ang bawat pagtingin</li>
          <li>Awtomatikong tinatakpan ng system ang number at email sa chat</li>
          <li>May audit log kung sino ang tumingin ng sensitibong data at kailan</li>
          <li>Kung may data breach na malamang makaapekto sa'yo, ipapaalam namin sa'yo <strong>at sa NPC sa loob ng 72 oras</strong>, gaya ng iniaatas ng batas</li>
        </ul>
      </Card>

      <Card>
        <h2 className="font-bold">6. Mga bata</h2>
        <p className="mt-2 text-sm text-gray-700">
          Hindi para sa wala pang 18 taong gulang ang HanapGawa. Kapag nalaman naming menor de edad ang
          isang user, ipapasara namin ang account at buburahin ang data.
        </p>
      </Card>

      <p className="pb-4 text-center text-sm text-gray-500">
        Tingnan din ang <Link href="/terms" className="font-bold text-brand-800 underline">Terms of Service</Link> at ang{" "}
        <Link href="/safety" className="font-bold text-brand-800 underline">Safety guide</Link>.
      </p>
    </div>
  );
}
