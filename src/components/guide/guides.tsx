"use client";

import { ArrowRight, BadgePercent, Bell, BellRing, CircleCheck, MessageCircle, Pause, Play, Plus, Search, TrendingUp, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useT } from "@/components/lang-provider";
import { CONTACT_SCENES, ContactDemo, FIND_SCENES, FindDemo, SELL_SCENES, SellDemo, WANTED_SCENES, WantedDemo } from "./demos";
import { Phone, useDemoPlayer } from "./phone";

type Step = { title: string; text: string };
type Guide = {
  id: string;
  icon: LucideIcon;
  title: string;
  intro: string;
  steps: Step[];
  count: number;
  Demo: (p: { scene: number }) => React.ReactNode;
  cta: { href: string; label: string };
};

// Textarnir eru íslenskir lyklar fyrir t(); þýðingar í en.ts
export const GUIDES: Guide[] = [
  {
    id: "selja",
    icon: Plus,
    title: "Selja hlut",
    intro: "Auglýsing á innan við tveimur mínútum, beint úr símanum.",
    count: SELL_SCENES,
    Demo: SellDemo,
    cta: { href: "/ny-auglysing", label: "Setja inn auglýsingu" },
    steps: [
      { title: "Ýttu á „Selja“", text: "Appelsínuguli takkinn í miðjunni neðst. Í tölvu er hann efst til hægri." },
      { title: "Veldu hvað þú selur", text: "Varahlut, partabíl eða heilan bíl." },
      { title: "Taktu myndir", text: "Fyrsta myndin birtist í leitinni. Ýttu á ✨ til að lagfæra birtu og liti." },
      { title: "Fyrirsögn, verð og bíll", text: "Segðu í hvaða bíla hluturinn passar, þá finna réttu kaupendurnir hann." },
      { title: "Birtu auglýsinguna", text: "Hún fer strax í loftið og þú færð tilkynningu þegar einhver sendir skilaboð." },
    ],
  },
  {
    id: "oska-eftir",
    icon: BellRing,
    title: "Óska eftir hlut",
    intro: "Finnurðu ekki hlutinn? Skráðu ósk og við látum þig vita þegar hann kemur.",
    count: WANTED_SCENES,
    Demo: WantedDemo,
    cta: { href: "/oska-eftir/ny", label: "Skrá ósk" },
    steps: [
      { title: "Ýttu á „Óska eftir“", text: "Í neðri valmyndinni." },
      { title: "Ýttu á „Ný ósk“", text: "Þú getur átt margar óskir í einu." },
      { title: "Skrifaðu hvað þig vantar", text: "Veldu bílinn og settu hámarksverð ef þú vilt." },
      { title: "Vistaðu óskina", text: "Þú getur sett hana í hlé eða eytt henni hvenær sem er." },
      { title: "Við látum þig vita", text: "Um leið og auglýsing sem passar birtist færðu tilkynningu í símann eða tölvupóst." },
    ],
  },
  {
    id: "finna",
    icon: Search,
    title: "Finna rétta hlutinn",
    intro: "Veldu bílinn þinn einu sinni og sjáðu bara það sem passar.",
    count: FIND_SCENES,
    Demo: FindDemo,
    cta: { href: "/leit", label: "Byrja að leita" },
    steps: [
      { title: "Ýttu á „Minn bíll“", text: "Á forsíðunni." },
      { title: "Veldu tegund, gerð og árgerð", text: "Partar man bílinn næst þegar þú kemur." },
      { title: "Leitaðu að hlutnum", text: "Leitin skilur innsláttarvillur og virkar líka án íslenskra stafa." },
      { title: "Vistaðu í Uppáhalds", text: "Ýttu á hjartað. Þú færð tilkynningu ef verðið lækkar." },
    ],
  },
  {
    id: "kaupa",
    icon: MessageCircle,
    title: "Hafa samband og kaupa",
    intro: "Spjallaðu við seljandann í appinu, án þess að gefa upp símanúmer.",
    count: CONTACT_SCENES,
    Demo: ContactDemo,
    cta: { href: "/leit", label: "Skoða auglýsingar" },
    steps: [
      { title: "Ýttu á „Senda skilaboð“", text: "Neðst á auglýsingunni. Sumir seljendur sýna líka símanúmer." },
      { title: "Spjallaðu við seljandann", text: "Spyrðu um hlutinn og semjið um verð. Þú getur sent myndir." },
      { title: "Hittist og skoðið hlutinn", text: "Borgaðu ekki fyrr en þú hefur séð hlutinn." },
      { title: "Gefðu einkunn", text: "Einkunnin hjálpar öðrum að finna trausta seljendur." },
    ],
  },
];

function GuideSection({ guide, index }: { guide: Guide; index: number }) {
  const { t } = useT();
  const { ref, scene, playing, toggle, jump } = useDemoPlayer(guide.count);
  const { Demo, icon: Icon } = guide;

  return (
    <section id={guide.id} className="scroll-mt-20 rounded-3xl bg-surface p-5 md:p-8">
      <div ref={ref} className={`md:flex md:items-center md:gap-12 ${index % 2 ? "md:flex-row-reverse" : ""}`}>
        <div className="md:shrink-0">
          <Phone>
            <Demo scene={scene} />
          </Phone>
          <div className="mt-3 flex items-center justify-center gap-2">
            <div className="flex gap-1.5">
              {Array.from({ length: guide.count }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => jump(i)}
                  aria-label={t("Skref {n}", { n: i + 1 })}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === scene ? "w-6 bg-orange-600" : "w-1.5 bg-stone-300 hover:bg-stone-400"}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? t("Stöðva myndband") : t("Spila myndband")}
              className="grid size-7 place-items-center rounded-full bg-surface-2 text-stone-700 hover:text-stone-900"
            >
              {playing ? <Pause size={13} /> : <Play size={13} />}
            </button>
          </div>
        </div>

        <div className="mt-6 min-w-0 flex-1 md:mt-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-orange-600">
            <span className="grid size-7 place-items-center rounded-lg bg-orange-600/12">
              <Icon size={16} />
            </span>
            {t("Leiðbeiningar")} {index + 1}/{GUIDES.length}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">{t(guide.title)}</h2>
          <p className="mt-1 text-stone-600">{t(guide.intro)}</p>

          <ol className="mt-5 space-y-1">
            {guide.steps.map((s, i) => {
              const on = i === scene;
              return (
                <li key={s.title}>
                  <button
                    type="button"
                    onClick={() => jump(i)}
                    aria-current={on ? "step" : undefined}
                    className={`flex w-full gap-3 rounded-xl p-2.5 text-left transition-colors ${on ? "bg-orange-600/10" : "hover:bg-surface-2"}`}
                  >
                    <span
                      className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums transition-colors ${
                        on ? "bg-orange-600 text-white" : i < scene ? "bg-orange-600/15 text-orange-600" : "bg-surface-2 text-stone-500"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className={`block font-semibold ${on ? "text-stone-900" : "text-stone-700"}`}>{t(s.title)}</span>
                      <span className="block text-sm text-stone-600">{t(s.text)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <Link
            href={guide.cta.href}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-orange-600 px-5 py-2.5 font-semibold text-white transition active:scale-[0.97] hover:bg-orange-700"
          >
            {t(guide.cta.label)} <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

const TIPS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: CircleCheck, title: "Merktu selt", text: "Undir „Mínar auglýsingar“ þegar hluturinn er farinn. Þá hætta fyrirspurnirnar." },
  { icon: TrendingUp, title: "Ýttu upp", text: "Færðu auglýsinguna aftur efst í leitinni með „Ýta upp“ á „Mínar auglýsingar“." },
  { icon: BadgePercent, title: "Lækkaðu verðið", text: "Þeir sem eiga hlutinn í Uppáhalds fá tilkynningu og merkið „Verð lækkað“ birtist." },
  { icon: Bell, title: "Kveiktu á tilkynningum", text: "Undir „Ég“ svo þú missir aldrei af kaupanda eða hlut sem þú óskaðir eftir." },
];

export function Guides() {
  const { t } = useT();
  return (
    <div className="mx-auto max-w-md px-4 pb-10 pt-6 md:max-w-page md:px-8 md:pt-10">
      <header className="mb-6 md:mb-10 md:text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 md:text-5xl">{t("Svona virkar Partar")}</h1>
        <p className="mt-2 text-stone-600 md:text-lg">{t("Stuttar leiðbeiningar með myndböndum. Ýttu á skref til að sjá það aftur.")}</p>
        <nav aria-label={t("Leiðbeiningar")} className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:justify-center md:px-0">
          {GUIDES.map(({ id, title, icon: Icon }) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface px-3.5 py-2 text-sm font-medium text-stone-800 ring-1 ring-line hover:bg-surface-2"
            >
              <Icon size={15} className="text-orange-600" /> {t(title)}
            </a>
          ))}
        </nav>
      </header>

      <div className="space-y-5 md:space-y-8">
        {GUIDES.map((g, i) => (
          <GuideSection key={g.id} guide={g} index={i} />
        ))}
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight text-stone-900">{t("Góð ráð fyrir seljendur")}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {TIPS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl bg-surface p-4">
              <span className="grid size-9 place-items-center rounded-xl bg-orange-600/12 text-orange-600">
                <Icon size={18} />
              </span>
              <p className="mt-3 font-semibold text-stone-900">{t(title)}</p>
              <p className="mt-1 text-sm text-stone-600">{t(text)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
