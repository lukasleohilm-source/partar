"use client";

import { Bell, CarFront, Check, Cog, Disc3, ImagePlus, Lightbulb, MessageCircle, Search, ShieldCheck, Sparkles, Star } from "lucide-react";
import { useT } from "@/components/lang-provider";
import { LogoMark } from "@/components/logo";
import {
  BottomNav,
  Field,
  HomeScreen,
  MiniCard,
  NAV_X,
  NAV_Y,
  ORANGE,
  PartPhoto,
  PrimaryButton,
  Screen,
  Tap,
  TopBar,
  Typed,
} from "./phone";

// Fjögur leiðbeiningamyndbönd. Hvert er fall af senunúmeri; textarnir við hlið símans eru í guides.tsx.

function Cards({ heart }: { heart?: boolean }) {
  const { t } = useT();
  return (
    <div className="mt-2.5 grid grid-cols-2 gap-1.5">
      <MiniCard icon={Lightbulb} hue={28} title={t("Framljós vinstra megin")} price="15.000 kr." />
      <MiniCard icon={Disc3} hue={210} title={t("Bremsuklossar að framan")} price="6.000 kr." heart={heart} />
      <MiniCard icon={Cog} hue={150} title={t("Alternator")} price="22.000 kr." />
      <MiniCard icon={CarFront} hue={350} title={t("Afturljós")} price="12.000 kr." />
    </div>
  );
}

// ——— Selja hlut ———
export const SELL_SCENES = 5;
export function SellDemo({ scene }: { scene: number }) {
  const { t } = useT();
  switch (scene) {
    case 0:
      return (
        <Screen key="s0">
          <HomeScreen>
            <Cards />
          </HomeScreen>
          <BottomNav active={0} />
          <Tap x={NAV_X[2]} y="91%" />
        </Screen>
      );
    case 1:
      return (
        <Screen key="s1">
          <TopBar title={t("Hvað ertu að selja?")} step={1} of={5} />
          <div className="mt-3 space-y-1.5 px-3">
            {[
              { label: "Varahlutur", icon: Cog, on: true },
              { label: "Partabíll", icon: CarFront },
              { label: "Bíll", icon: CarFront },
            ].map(({ label, icon: Icon, on }) => (
              <div
                key={label}
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-2.5 text-[9.5px] font-medium transition-colors delay-700 ${
                  on ? "border-orange-500 bg-orange-500/10" : "border-white/12"
                }`}
              >
                <Icon size={13} className="text-white/70" /> {t(label)}
              </div>
            ))}
          </div>
          <Tap x="45%" y="22%" />
        </Screen>
      );
    case 2:
      return (
        <Screen key="s2">
          <TopBar title={t("Myndir")} step={2} of={5} />
          <div className="mt-3 grid grid-cols-3 gap-1 px-3">
            {[
              { hue: 28, d: 500 },
              { hue: 35, d: 900 },
              { hue: 20, d: 1300 },
            ].map(({ hue, d }) => (
              <div key={hue} className="opacity-0 [animation:partar-pop_.4s_ease-out_forwards]" style={{ animationDelay: `${d}ms` }}>
                <PartPhoto icon={Lightbulb} hue={hue} className="aspect-square rounded-md" />
              </div>
            ))}
            <div className="grid aspect-square place-items-center rounded-md border border-dashed border-white/25 text-white/60">
              <ImagePlus size={14} />
            </div>
          </div>
          <p className="mt-2 flex items-center gap-1 px-3 text-[7.5px] text-white/55">
            <Sparkles size={9} className="text-orange-400" /> {t("Ýttu á ✨ til að lagfæra birtu og liti.")}
          </p>
          <PrimaryButton>{t("Áfram")}</PrimaryButton>
          <Tap x="21%" y="27%" />
        </Screen>
      );
    case 3:
      return (
        <Screen key="s3">
          <TopBar title={t("Upplýsingar")} step={3} of={5} />
          <div className="mt-3 space-y-2 px-3">
            <Field label={t("Fyrirsögn")} focus>
              <Typed text={t("Framljós vinstra megin")} />
            </Field>
            <Field label={t("Ástand")}>{t("Notað – gott")}</Field>
            <Field label={t("Verð")}>
              <Typed text="15.000 kr." delay={1700} />
            </Field>
            <Field label={t("Passar í")}>Toyota Yaris 2006–2011</Field>
          </div>
          <PrimaryButton>{t("Áfram")}</PrimaryButton>
          <Tap x="50%" y="91%" delay={1800} />
        </Screen>
      );
    default:
      return (
        <Screen key="s4">
          <TopBar title={t("Yfirlit")} step={5} of={5} />
          <div className="mt-3 px-3">
            <PartPhoto icon={Lightbulb} hue={28} className="aspect-[4/3] rounded-lg" />
            <p className="mt-1.5 text-[10px] font-semibold">{t("Framljós vinstra megin")}</p>
            <p className="text-[10px] font-bold" style={{ color: ORANGE }}>
              15.000 kr.
            </p>
          </div>
          <PrimaryButton pressed>{t("Birta auglýsingu")}</PrimaryButton>
          <Tap x="50%" y="91%" />
          {/* Staðfesting eftir að ýtt er */}
          <div className="absolute inset-x-3 top-1/2 z-20 -translate-y-1/2 rounded-xl bg-[#1d1f20] p-3 text-center opacity-0 shadow-2xl ring-1 ring-white/10 [animation:partar-pop_.45s_ease-out_1.3s_forwards]">
            <span className="mx-auto grid size-8 place-items-center rounded-full bg-emerald-500 text-white">
              <Check size={16} strokeWidth={3} />
            </span>
            <p className="mt-1.5 text-[10px] font-semibold">{t("Auglýsingin er komin á Partar!")}</p>
            <p className="mt-0.5 text-[7.5px] text-white/55">{t("Þú færð tilkynningu þegar einhver sendir skilaboð.")}</p>
          </div>
        </Screen>
      );
  }
}

// ——— Óska eftir ———
export const WANTED_SCENES = 5;
export function WantedDemo({ scene }: { scene: number }) {
  const { t } = useT();
  switch (scene) {
    case 0:
      return (
        <Screen key="w0">
          <HomeScreen>
            <Cards />
          </HomeScreen>
          <BottomNav active={0} />
          <Tap x={NAV_X[1]} y={NAV_Y} />
        </Screen>
      );
    case 1:
      return (
        <Screen key="w1">
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-[11px] font-bold">{t("Óska eftir")}</span>
            <span className="rounded-full px-2 py-0.5 text-[8px] font-semibold text-white" style={{ background: ORANGE }}>
              + {t("Ný ósk")}
            </span>
          </div>
          <div className="mx-3 mt-6 rounded-xl border border-white/10 p-3 text-center">
            <Bell size={18} className="mx-auto text-orange-400" />
            <p className="mt-1.5 text-[9.5px] font-semibold">{t("Vantar þig eitthvað?")}</p>
            <p className="mt-0.5 text-[7.5px] leading-snug text-white/55">
              {t("Skráðu hvað þú leitar að og við látum þig vita um leið og auglýsing sem passar birtist.")}
            </p>
          </div>
          <BottomNav active={1} />
          <Tap x="80%" y="8.5%" />
        </Screen>
      );
    case 2:
      return (
        <Screen key="w2">
          <TopBar title={t("Ný ósk")} />
          <div className="mt-3 space-y-2 px-3">
            <Field label={t("Hvað vantar þig?")} focus>
              <Typed text={t("Afturljós")} />
            </Field>
            <Field label={t("Fyrir hvaða bíl?")}>Toyota Yaris 2008</Field>
            <Field label={t("Hámarksverð")}>
              <Typed text="20.000 kr." delay={1300} />
            </Field>
            <Field label={t("Landshluti")}>{t("Allt landið")}</Field>
          </div>
          <PrimaryButton>{t("Vista ósk")}</PrimaryButton>
        </Screen>
      );
    case 3:
      return (
        <Screen key="w3">
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-[11px] font-bold">{t("Óska eftir")}</span>
          </div>
          <p className="mt-2 px-3 text-[8px] font-semibold uppercase tracking-wide text-white/50">{t("Mínar óskir")}</p>
          <div className="mx-3 mt-1 flex items-center gap-2 rounded-lg border border-white/10 p-2 [animation:partar-pop_.4s_ease-out]">
            <span className="grid size-7 place-items-center rounded-md bg-orange-500/15 text-orange-400">
              <Search size={12} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-semibold">{t("Afturljós")}</p>
              <p className="text-[7.5px] text-white/55">Toyota Yaris 2008 · {t("hámark")} 20.000 kr.</p>
            </div>
            <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[7px] font-semibold text-emerald-400">{t("Virk")}</span>
          </div>
          <BottomNav active={1} />
        </Screen>
      );
    default:
      return (
        <Screen key="w4" className="bg-[linear-gradient(160deg,#1e293b,#0f172a_60%,#111827)]">
          <p className="mt-6 text-center text-[26px] font-light tabular-nums">9:41</p>
          <div className="mx-2.5 mt-4 flex gap-2 rounded-xl bg-white/15 p-2 backdrop-blur [animation:partar-drop_.5s_ease-out_.4s_both]">
            <LogoMark size={20} className="shrink-0 rounded-md" />
            <div className="min-w-0">
              <p className="text-[8px] font-semibold">Partar</p>
              <p className="text-[8px] leading-snug text-white/85">{t("Ný auglýsing passar við óskina þína: Afturljós – Toyota Yaris, 12.000 kr.")}</p>
            </div>
          </div>
        </Screen>
      );
  }
}

// ——— Finna hlut ———
export const FIND_SCENES = 4;
export function FindDemo({ scene }: { scene: number }) {
  const { t } = useT();
  switch (scene) {
    case 0:
      return (
        <Screen key="f0">
          <HomeScreen>
            <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-white/12 px-2 py-1.5">
              <CarFront size={12} className="text-orange-400" />
              <span className="text-[8.5px] font-semibold">{t("Minn bíll")}</span>
            </div>
            <Cards />
          </HomeScreen>
          <BottomNav active={0} />
          <Tap x="25%" y="21%" />
        </Screen>
      );
    case 1:
      return (
        <Screen key="f1">
          <HomeScreen />
          <div className="absolute inset-0 z-10 bg-black/50" />
          <div className="absolute inset-x-0 bottom-0 z-20 rounded-t-2xl bg-[#18191a] px-3 pb-5 pt-2 [animation:partar-rise_.4s_ease-out]">
            <div className="mx-auto mb-2 h-1 w-8 rounded-full bg-white/25" />
            <p className="mb-2 text-[10px] font-semibold">{t("Minn bíll")}</p>
            <div className="space-y-1.5">
              <Field label={t("Tegund")}>
                <Typed text="Toyota" delay={200} />
              </Field>
              <Field label={t("Gerð")}>
                <Typed text="Yaris" delay={800} />
              </Field>
              <Field label={t("Árgerð")}>
                <Typed text="2008" delay={1300} />
              </Field>
            </div>
            <div className="mt-2.5 rounded-lg py-1.5 text-center text-[9px] font-semibold text-white" style={{ background: ORANGE }}>
              {t("Vista")}
            </div>
          </div>
        </Screen>
      );
    case 2:
      return (
        <Screen key="f2">
          <div className="px-3">
            <div className="mt-1.5 flex items-center gap-1.5 rounded-full border border-orange-500 px-2.5 py-1.5 text-[8.5px] ring-2 ring-orange-500/20">
              <Search size={9} className="text-white/60" />
              <Typed text={t("bremsuklossar")} delay={200} />
            </div>
            <div className="mt-1.5 flex items-center gap-1 rounded-lg bg-orange-500/10 px-2 py-1 text-[7.5px] text-orange-300">
              <CarFront size={9} /> {t("Sýni bara það sem passar í")} Toyota Yaris 2008
            </div>
            <Cards />
          </div>
          <BottomNav active={0} />
        </Screen>
      );
    default:
      return (
        <Screen key="f3">
          <div className="px-3">
            <div className="mt-1.5 flex items-center gap-1.5 rounded-full border border-white/12 px-2.5 py-1.5 text-[8.5px]">
              <Search size={9} className="text-white/60" /> {t("bremsuklossar")}
            </div>
            <Cards heart />
          </div>
          <BottomNav active={0} />
          <Tap x="88%" y="22.5%" />
          <div className="absolute inset-x-6 bottom-14 z-20 rounded-full bg-white px-2 py-1 text-center text-[8px] font-semibold text-stone-900 opacity-0 [animation:partar-pop_.35s_ease-out_1s_forwards]">
            ♥ {t("Vistað í Uppáhalds")}
          </div>
        </Screen>
      );
  }
}

// ——— Hafa samband og kaupa ———
export const CONTACT_SCENES = 4;
export function ContactDemo({ scene }: { scene: number }) {
  const { t } = useT();
  const bubble = (mine: boolean, text: string, delay: number) => (
    <div className={`flex ${mine ? "justify-end" : ""}`}>
      <p
        className={`max-w-[78%] rounded-2xl px-2 py-1 text-[8.5px] leading-snug opacity-0 [animation:partar-pop_.35s_ease-out_forwards] ${
          mine ? "rounded-br-sm text-white" : "rounded-bl-sm bg-white/10"
        }`}
        style={{ animationDelay: `${delay}ms`, background: mine ? ORANGE : undefined }}
      >
        {text}
      </p>
    </div>
  );
  const chatHeader = (
    <div className="flex items-center gap-1.5 border-b border-white/10 px-3 pb-1.5 pt-1">
      <span className="grid size-5 place-items-center rounded-full bg-emerald-600 text-[8px] font-bold">J</span>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-semibold">Jón</p>
        <p className="truncate text-[7px] text-white/50">{t("Framljós vinstra megin")} · 15.000 kr.</p>
      </div>
    </div>
  );
  switch (scene) {
    case 0:
      return (
        <Screen key="c0">
          <PartPhoto icon={Lightbulb} hue={28} className="aspect-[4/3]" />
          <div className="px-3 pt-2">
            <p className="text-[10.5px] font-semibold">{t("Framljós vinstra megin")}</p>
            <p className="text-[11px] font-bold" style={{ color: ORANGE }}>
              15.000 kr.
            </p>
            <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-white/5 p-1.5">
              <span className="grid size-6 place-items-center rounded-full bg-emerald-600 text-[9px] font-bold">J</span>
              <div>
                <p className="text-[8.5px] font-semibold">Jón</p>
                <p className="flex items-center gap-0.5 text-[7px] text-emerald-400">
                  <Star size={7} className="fill-amber-400 text-amber-400" /> 4,9 · {t("12 einkunnir")}
                </p>
              </div>
            </div>
          </div>
          <PrimaryButton pressed>
            <span className="inline-flex items-center gap-1">
              <MessageCircle size={10} /> {t("Senda skilaboð")}
            </span>
          </PrimaryButton>
          <Tap x="50%" y="91%" />
        </Screen>
      );
    case 1:
      return (
        <Screen key="c1">
          {chatHeader}
          <div className="space-y-1.5 px-3 pt-2.5">
            {bubble(true, t("Hæ! Er framljósið enn til?"), 300)}
            {bubble(false, t("Já, það er til. Passar í Yaris 2006–2011."), 1300)}
            {bubble(true, t("Frábært, má ég sækja það í dag?"), 2200)}
          </div>
          <div className="absolute inset-x-3 bottom-4 rounded-full border border-white/12 px-2.5 py-1.5 text-[8px] text-white/40">{t("Skrifaðu skilaboð…")}</div>
        </Screen>
      );
    case 2:
      return (
        <Screen key="c2">
          {chatHeader}
          <div className="space-y-1.5 px-3 pt-2.5">
            {bubble(false, t("Ekkert mál, ég er í Hafnarfirði. Kl. 17?"), 200)}
            {bubble(true, t("Kem kl. 17 👍"), 1000)}
          </div>
          <div className="absolute inset-x-3 bottom-5 flex gap-2 rounded-xl bg-emerald-500/10 p-2 opacity-0 ring-1 ring-emerald-500/30 [animation:partar-pop_.4s_ease-out_1.8s_forwards]">
            <ShieldCheck size={14} className="shrink-0 text-emerald-400" />
            <p className="text-[7.5px] leading-snug text-emerald-100">{t("Skoðaðu hlutinn áður en þú borgar og hittist á öruggum stað.")}</p>
          </div>
        </Screen>
      );
    default:
      return (
        <Screen key="c3">
          {chatHeader}
          <div className="absolute inset-x-0 bottom-0 z-20 rounded-t-2xl bg-[#18191a] px-3 pb-5 pt-2 [animation:partar-rise_.4s_ease-out]">
            <div className="mx-auto mb-2 h-1 w-8 rounded-full bg-white/25" />
            <p className="text-[10px] font-semibold">{t("Gefa einkunn")}</p>
            <div className="mt-2 flex justify-center gap-1.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star
                  key={i}
                  size={18}
                  className="text-white/25 [animation:partar-star_.3s_ease-out_forwards]"
                  style={{ animationDelay: `${500 + i * 180}ms` }}
                />
              ))}
            </div>
            <p className="mt-2 text-center text-[8px] text-white/60">{t("Hvernig gengu viðskiptin? (valfrjálst)")}</p>
            <div className="mt-2.5 rounded-lg py-1.5 text-center text-[9px] font-semibold text-white" style={{ background: ORANGE }}>
              {t("Vista einkunn")}
            </div>
          </div>
          <Tap x="69%" y="79%" delay={400} />
        </Screen>
      );
  }
}
