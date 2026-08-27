import Link from "next/link";
import { Card } from "@/components/ui";
import { PLATFORM_DEFAULT_TAKE_RATE_BPS } from "@/lib/money";

export const metadata = {
  title: "Terms of Service — HanapGawa",
  description: "Ang kasunduan sa pagitan mo at ng HanapGawa: escrow, bayad, dispute, at mga bawal.",
};

const RATE = PLATFORM_DEFAULT_TAKE_RATE_BPS / 100;

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Terms of Service</h1>
        <p className="mt-1 text-sm text-gray-500">Huling update: 25 Agosto 2026</p>
      </div>

      <Card className="border-brand-200 bg-brand-50">
        <h2 className="font-bold text-brand-900">Ang maikling bersyon</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-brand-900">
          <li>Kami ay <strong>lugar ng pagkikita</strong> — hindi kami ang employer ng provider.</li>
          <li>Hawak namin ang bayad sa escrow hanggang kumpirmahin ng client na tapos ang trabaho.</li>
          <li>Kumikita kami ng <strong>{RATE}%</strong> sa bawat natapos na trabaho. Libre ang mag-post at mag-offer.</li>
          <li>Bawal ang usapan at bayaran sa labas ng app — nawawala ang proteksyon ninyo pareho.</li>
          <li>Kung may gulo, may tao sa amin na aayos nito.</li>
        </ul>
      </Card>

      <Card>
        <h2 className="font-bold">1. Ano ang HanapGawa</h2>
        <p className="mt-2 text-sm text-gray-700">
          Ang HanapGawa ay isang online na plataporma kung saan nagkikita ang mga taong may kailangang
          ipagawa (<strong>Client</strong>) at ang mga taong handang gawin ito (<strong>Provider</strong>).
        </p>
        <p className="mt-2 text-sm text-gray-700">
          <strong>Hindi kami employer.</strong> Hindi kami nagre-recruit, hindi kami nagdi-deploy, at hindi
          kami nagsu-supervise ng trabaho. Ang Provider ay independent na nagtatrabaho para sa sarili:
          siya ang pumipili kung anong trabaho ang tatanggapin, magkano ang presyo niya, at kailan siya
          available. Walang employer-employee na relasyon sa pagitan ng HanapGawa at ng sinumang Provider.
        </p>
        <p className="mt-2 text-sm text-gray-700">
          Kasunod nito, ang Provider ang may responsibilidad sa sarili niyang buwis, SSS, PhilHealth at
          Pag-IBIG contributions.
        </p>
      </Card>

      <Card>
        <h2 className="font-bold">2. Sino ang pwedeng gumamit</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-700">
          <li>18 taong gulang pataas</li>
          <li>May totoong Philippine mobile number na kayang i-verify</li>
          <li>Hindi pa nasususpinde o na-ban sa HanapGawa dati</li>
          <li>Para sa trabahong ₱2,000 pataas: kailangang ID-verified ang Provider</li>
        </ul>
      </Card>

      <Card>
        <h2 className="font-bold">3. Ang pera: escrow at komisyon</h2>
        <ol className="mt-2 list-inside list-decimal space-y-2 text-sm text-gray-700">
          <li>Nag-cash in ang Client sa wallet niya sa app.</li>
          <li>
            Kapag tinanggap ng Client ang offer, <strong>hina-hold namin ang buong halaga</strong>. Hindi na
            ito magagalaw ng Client, at hindi pa mapupunta sa Provider.
          </li>
          <li>
            Kapag kinumpirma ng Client na tapos ang trabaho, ire-release namin ito:{" "}
            <strong>{100 - RATE}% sa Provider</strong> at <strong>{RATE}% sa HanapGawa</strong> bilang bayad
            sa serbisyo ng plataporma.
          </li>
          <li>Kapag kinansela bago matapos, ibinabalik sa Client ang buong hold.</li>
          <li>Kapag may dispute, naka-freeze ang pera hanggang may magdesisyong tao sa amin.</li>
        </ol>
        <p className="mt-3 rounded-xl bg-stone-50 p-3 text-sm text-gray-700">
          Ang komisyon ay ipinapakita bago mo tanggapin ang offer at <strong>naka-lock na sa halagang
          iyon</strong> para sa trabahong iyon — hindi ito puwedeng baguhin pagkatapos.
        </p>
        <p className="mt-2 text-sm text-gray-700">
          Ang aktwal na paglipat ng pera ay hinahawakan ng lisensyadong payment provider. Hindi kami bangko
          at hindi kami nag-aalok ng deposito o interes.
        </p>
      </Card>

      <Card>
        <h2 className="font-bold">4. Bakit bawal ang usapan sa labas ng app</h2>
        <p className="mt-2 text-sm text-gray-700">
          Awtomatikong tinatakpan namin ang cellphone number, email at social media handle sa chat. Bawal
          ding hikayatin ang isa't isa na lumabas ng plataporma para umiwas sa bayad.
        </p>
        <p className="mt-2 text-sm text-gray-700">
          Hindi lang ito para sa kita namin — kapag lumabas kayo ng app, <strong>wala nang escrow, walang
          record, at wala kaming maitutulong</strong> kung hindi magbayad ang isa o hindi sumipot ang isa.
          Ang paulit-ulit na paglabag ay maaaring magresulta sa suspensyon ng account.
        </p>
      </Card>

      <Card>
        <h2 className="font-bold">5. Mga bawal</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-700">
          <li>Panloloko, pekeng identity, o pekeng review</li>
          <li>Ilegal na serbisyo, o serbisyong sekswal</li>
          <li>Panliligalig, pananakot, diskriminasyon, o pang-aabuso</li>
          <li>Paggamit ng account ng iba, o pagpapagamit ng sarili mong account</li>
          <li>Pagkuha ng data ng ibang user (scraping) o pagsubok sirain ang sistema</li>
          <li>Pag-abuso sa SOS button kung walang totoong emergency</li>
        </ul>
      </Card>

      <Card>
        <h2 className="font-bold">6. Kapag may hindi pagkakaunawaan</h2>
        <p className="mt-2 text-sm text-gray-700">
          Alinman sa Client o Provider ay pwedeng mag-file ng dispute habang aktibo ang trabaho. Kapag
          na-file na, <strong>naka-freeze ang pera</strong> — walang makakapag-cancel o makakapag-release
          hangga't hindi ito nadedesisyunan ng support team.
        </p>
        <p className="mt-2 text-sm text-gray-700">
          Titingnan namin ang chat, ang check-in record, at ang mga larawan o detalyeng ibibigay ninyo.
          Tatlo ang posibleng resulta: ibalik sa Client, bayaran ang Provider, o hatiin. Sinusubukan
          naming magdesisyon sa loob ng 5 araw ng trabaho.
        </p>
        <p className="mt-2 text-sm text-gray-700">
          Kung hindi kayo sang-ayon sa desisyon namin, may karapatan pa rin kayong dumulog sa barangay,
          sa DTI, o sa korte. Hindi inaalis ng Terms na ito ang karapatan ninyo sa ilalim ng batas ng
          Pilipinas, kasama na ang Consumer Act.
        </p>
      </Card>

      <Card>
        <h2 className="font-bold">7. Kaligtasan at hangganan ng pananagutan</h2>
        <p className="mt-2 text-sm text-gray-700">
          Nagve-verify kami ng identity at nagbibigay ng SOS at check-in tools, pero{" "}
          <strong>hindi namin kayang garantiyahan ang ugali ng ibang tao</strong>. Ikaw pa rin ang huling
          nagdedesisyon kung sino ang papapasukin mo sa bahay mo o kaninong bahay ka papasok.
        </p>
        <p className="mt-2 text-sm text-gray-700">
          Sa abot ng pinapayagan ng batas, ang pananagutan namin sa anumang isyu sa isang trabaho ay
          limitado sa halaga ng komisyong kinita namin doon. Hindi kami mananagot sa pinsalang dulot ng
          Client o Provider sa isa't isa. <strong>Hindi ito naglilimita ng pananagutan para sa pinsalang
          dulot ng sarili naming pagpapabaya, panloloko, o para sa pinsala sa katawan</strong> — bawal
          iyon sa batas at hindi namin sinusubukan.
        </p>
        <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          Sa emergency, <strong>tumawag muna sa 911</strong>. Ang SOS button ay karagdagang tulong, hindi
          kapalit ng pulis o ambulansya.
        </p>
      </Card>

      <Card>
        <h2 className="font-bold">8. Pagsasara ng account</h2>
        <p className="mt-2 text-sm text-gray-700">
          Pwede kang umalis anumang oras. Pwede naming suspindihin ang account na lumalabag sa Terms na
          ito, karaniwang may babala muna maliban kung may panganib sa iba. Ang perang nasa wallet mo na
          hindi konektado sa anumang bukas na dispute ay maibabalik sa'yo.
        </p>
      </Card>

      <Card>
        <h2 className="font-bold">9. Mga pagbabago at batas na sumasakop</h2>
        <p className="mt-2 text-sm text-gray-700">
          Kapag may mahalagang pagbabago sa Terms na ito, ipapaalam namin sa app bago ito magkabisa.
          Sakop ito ng batas ng Republika ng Pilipinas.
        </p>
        <p className="mt-2 text-sm text-gray-700">
          Mga katanungan: <strong>[support email]</strong>
        </p>
      </Card>

      <p className="pb-4 text-center text-sm text-gray-500">
        Tingnan din ang <Link href="/privacy" className="font-bold text-brand-800 underline">Privacy Notice</Link> at ang{" "}
        <Link href="/safety" className="font-bold text-brand-800 underline">Safety guide</Link>.
      </p>
    </div>
  );
}
