import { LegalPage } from "@/components/legal-page";
import { getT } from "@/lib/lang-server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: `${t("Persónuvernd")} – Partar` };
}

export default function PrivacyPage() {
  return (
    <LegalPage title="Persónuverndarstefna" updated="23. október 2026">
      <p>
        Hér kemur fram hvaða persónuupplýsingar Partar vinnur, í hvaða tilgangi og hvaða réttindi þú hefur samkvæmt lögum
        nr. 90/2018 og almennu persónuverndarreglugerðinni (GDPR).
      </p>

      <h2>Ábyrgðaraðili</h2>
      <p>[Nafn rekstraraðila], kt. [kennitala], [heimilisfang]. Netfang: [netfang].</p>

      <h2>Hvaða upplýsingar við vinnum</h2>
      <ul>
        <li>Netfang, ef þú skráir þig inn með tölvupósti.</li>
        <li>Nafn sem birtist, landshluti og símanúmer ef þú skráir það (síminn sést aðeins ef þú leyfir það).</li>
        <li>Auglýsingar þínar, þar með taldar myndir, lýsingar, verð, staðsetning og bílnúmer ef þú skráir það.</li>
        <li>Skilaboð sem þú sendir og færð í spjalli.</li>
        <li>Óskir („Óska eftir“) og tilkynningar sem þeim tengjast.</li>
        <li>Tæknilegar upplýsingar sem þarf til að appið virki, svo sem innskráningarlota og IP-tala í annálum.</li>
      </ul>

      <h2>Tilgangur og heimild</h2>
      <ul>
        <li>Að veita þjónustuna, þ.e. birta auglýsingar, leit, spjall og tilkynningar (samningur við þig).</li>
        <li>Að koma í veg fyrir misnotkun og svik, t.d. með CAPTCHA og tilkynningum um auglýsingar (lögmætir hagsmunir).</li>
        <li>Að senda þér tilkynningar í síma eða tölvupósti, ef þú hefur kveikt á þeim (samþykki, sem má draga til baka).</li>
      </ul>

      <h2>Vafrakökur</h2>
      <p>
        Partar notar aðeins nauðsynlegar vafrakökur: innskráningarlotu og „Minn bíll“ sem geymir bílinn sem þú valdir.
        Engar auglýsinga- eða greiningarkökur eru notaðar.
      </p>

      <h2>Vinnsluaðilar</h2>
      <ul>
        <li>Supabase (gagnagrunnur, innskráning, myndageymsla). Gögn eru hýst á Írlandi (ESB).</li>
        <li>Vercel (hýsing vefsins).</li>
        <li>Resend (sending tölvupósts).</li>
        <li>Cloudflare Turnstile (vörn gegn vélmennum).</li>
      </ul>

      <h2>Hversu lengi</h2>
      <p>
        Upplýsingar eru geymdar á meðan aðgangurinn þinn er til. Þegar þú eyðir aðgangi (undir „Ég“) er auglýsingum,
        myndum, skilaboðum og óskum eytt strax. Afrit geta verið til í allt að 7 daga.
      </p>

      <h2>Réttindi þín</h2>
      <p>
        Þú átt rétt á að fá aðgang að upplýsingum um þig, fá þær leiðréttar eða eytt, takmarka vinnslu, andmæla henni og
        fá gögnin afhent. Hafðu samband á [netfang]. Þú getur einnig kvartað til Persónuverndar (personuvernd.is).
      </p>
    </LegalPage>
  );
}
