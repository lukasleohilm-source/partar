import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { getT } from "@/lib/lang-server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: `${t("Eyðing gagna")} – Partar` };
}

// Opin síða (án innskráningar) með leiðbeiningum um eyðingu gagna; Meta krefst hennar fyrir Facebook-innskráningu
export default function DataDeletionPage() {
  return (
    <LegalPage title="Eyðing gagna" updated="25. október 2026">
      <p>Þú getur eytt aðganginum þínum á Pörtum og öllum gögnum sem honum tengjast hvenær sem er, sjálf(ur) og strax.</p>

      <h2>Svona eyðir þú aðganginum</h2>
      <ol className="ml-5 list-decimal space-y-1">
        <li className="!list-decimal">Skráðu þig inn á partar.lukels255.com (með Google, Facebook eða netfangi).</li>
        <li className="!list-decimal">
          Opnaðu <strong>Ég</strong> og veldu <strong>Eyða aðgangi</strong> neðst.
        </li>
        <li className="!list-decimal">
          Ýttu á <strong>Eyða aðgangi og öllum gögnum</strong> og staðfestu.
        </li>
      </ol>

      <h2>Hverju er eytt</h2>
      <ul>
        <li>Prófíl, nafni, netfangi og símanúmeri</li>
        <li>Öllum auglýsingum þínum og myndum</li>
        <li>Skilaboðum, óskum, uppáhalds og tilkynningastillingum</li>
        <li>Tengingu við Google- eða Facebook-aðganginn þinn</li>
      </ul>
      <p>Eyðingin er varanleg og ekki hægt að afturkalla hana.</p>

      <h2>Fjarlægja Partar af Facebook</h2>
      <p>
        Þú getur líka fjarlægt aðgang Partar að Facebook-aðganginum þínum: á Facebook ferðu í{" "}
        <strong>Stillingar og friðhelgi → Stillingar → Öpp og vefsíður</strong>, velur Partar og ýtir á{" "}
        <strong>Fjarlægja</strong>. Það eyðir ekki aðganginum á Pörtum, til þess þarf að fylgja skrefunum hér að ofan.
      </p>

      <p>
        Nánar um meðferð persónuupplýsinga í <Link href="/personuvernd" className="underline">persónuverndarstefnunni</Link>.
      </p>
    </LegalPage>
  );
}
