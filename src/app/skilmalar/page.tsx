import { LegalPage } from "@/components/legal-page";
import { getT } from "@/lib/lang-server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: `${t("Skilmálar")} – Partar` };
}

export default function TermsPage() {
  return (
    <LegalPage title="Notendaskilmálar" updated="23. október 2026">
      <p>
        Partar er markaðstorg þar sem einstaklingar auglýsa notaða varahluti, partabíla og ódýra bíla. Með því að nota
        Partar samþykkir þú þessa skilmála.
      </p>

      <h2>Hlutverk Partar</h2>
      <p>
        Partar er vettvangur til að tengja kaupendur og seljendur. Partar er ekki aðili að viðskiptum, tekur ekki við
        greiðslum og ber ekki ábyrgð á ástandi, uppruna eða afhendingu þess sem selt er. Kaupandi og seljandi semja sín á
        milli.
      </p>

      <h2>Auglýsingar</h2>
      <ul>
        <li>Þú berð ábyrgð á að auglýsingar séu réttar og að þú megir selja það sem þú auglýsir.</li>
        <li>Óheimilt er að auglýsa stolna hluti, hluti sem ekki má selja samkvæmt lögum, eða villandi upplýsingar.</li>
        <li>Myndir verða að vera þínar eða þú að hafa leyfi til að nota þær.</li>
        <li>Partar má fjarlægja auglýsingar og loka aðgöngum sem brjóta gegn skilmálunum, án fyrirvara.</li>
      </ul>

      <h2>Samskipti</h2>
      <p>
        Spjall er ætlað fyrir samskipti um auglýsingar. Áreitni, ruslpóstur og tilraunir til svika eru óheimil. Þú getur
        tilkynnt auglýsingar og lokað á notendur.
      </p>

      <h2>Örugg viðskipti</h2>
      <ul>
        <li>Skoðaðu hlutinn áður en þú greiðir þegar því verður við komið.</li>
        <li>Varastu beiðnir um fyrirframgreiðslu til ókunnugra eða greiðslu utan Íslands.</li>
        <li>Fyrir bíla: athugaðu ferilskrá og veðbönd hjá Samgöngustofu áður en kaup eru gerð.</li>
      </ul>

      <h2>Ábyrgð</h2>
      <p>
        Partar er veitt „eins og það er“. Partar ber ekki ábyrgð á tjóni sem hlýst af viðskiptum notenda eða af því að
        þjónustan sé ekki aðgengileg, nema að því marki sem lög leyfa ekki takmörkun ábyrgðar.
      </p>

      <h2>Breytingar og lög</h2>
      <p>
        Skilmálunum má breyta og verða breytingar kynntar í appinu. Um skilmálana gilda íslensk lög og ágreiningur fer
        fyrir Héraðsdóm Reykjavíkur.
      </p>
    </LegalPage>
  );
}
