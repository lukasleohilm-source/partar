"use client";

import { EllipsisVertical, Pause, Play, RotateCcw, Share, SquarePlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/lang-provider";
import { LogoMark } from "@/components/logo";

export type DemoPlatform = "ios" | "android";

const SCENES = 4;
const SCENE_MS = 2600;

// Leiðbeiningamyndband um „Setja á heimaskjá“, teiknað í kóða: skarpt í öllum stærðum,
// nokkur KB, á tungumáli notandans. Spilar í hring meðan það sést; „minni hreyfing“ = kyrrt.
export function InstallDemo({ platform, onScene }: { platform: DemoPlatform; onScene?: (scene: number) => void }) {
  const { t } = useT();
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || !visible) return;
    const timer = setInterval(() => setScene((s) => (s + 1) % SCENES), SCENE_MS);
    return () => clearInterval(timer);
  }, [playing, visible]);

  useEffect(() => onScene?.(scene), [scene, onScene]);

  const captions =
    platform === "ios"
      ? [t("Ýttu á Deila neðst í Safari"), t("Veldu „Setja á heimaskjá“"), t("Ýttu á „Bæta við“"), t("Partar er komið á heimaskjáinn")]
      : [t("Ýttu á ⋮ efst til hægri"), t("Veldu „Setja upp forrit“"), t("Staðfestu með „Setja upp“"), t("Partar er komið á heimaskjáinn")];

  return (
    <figure ref={ref} className="mb-5">
      <div className="relative mx-auto w-[200px]" aria-hidden>
        {/* Sími */}
        <div className="relative aspect-[9/18.5] overflow-hidden rounded-[30px] border-[6px] border-stone-300 bg-[#0b0b0c] shadow-[0_12px_32px_rgb(0_0_0/0.5)]">
          {platform === "ios" ? <IosScreens scene={scene} /> : <AndroidScreens scene={scene} />}
        </div>
        {/* Framvinda */}
        <div className="mt-3 flex justify-center gap-1.5">
          {Array.from({ length: SCENES }, (_, i) => (
            <span key={i} className={`h-1 rounded-full transition-all duration-300 ${i === scene ? "w-6 bg-orange-600" : "w-1.5 bg-stone-300"}`} />
          ))}
        </div>
      </div>
      <figcaption className="mt-2 flex items-center justify-center gap-2">
        <span role="status" aria-live="polite" className="min-h-5 text-center text-sm font-medium text-stone-900">
          {scene + 1}. {captions[scene]}
        </span>
        <button
          type="button"
          onClick={() => {
            if (!playing && scene === SCENES - 1) setScene(0);
            setPlaying((p) => !p);
          }}
          aria-label={playing ? t("Stöðva myndband") : t("Spila myndband")}
          className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-stone-700 hover:text-stone-900"
        >
          {playing ? <Pause size={13} /> : <Play size={13} />}
        </button>
        {!playing && (
          <button
            type="button"
            onClick={() => setScene((s) => (s + 1) % SCENES)}
            aria-label={t("Næsta skref")}
            className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-stone-700 hover:text-stone-900"
          >
            <RotateCcw size={13} className="-scale-x-100" />
          </button>
        )}
      </figcaption>
    </figure>
  );
}

// Fingurinn: hringur sem birtist og ýtir á staðinn sem á að ýta á
function Tap({ x, y, show }: { x: string; y: string; show: boolean }) {
  return (
    <span
      className={`pointer-events-none absolute z-20 size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/90 bg-white/35 transition-all duration-500 ${
        show ? "scale-100 opacity-100 [animation:partar-tap_2.6s_ease-out_infinite]" : "scale-150 opacity-0"
      }`}
      style={{ left: x, top: y }}
    />
  );
}

// Smækkuð mynd af forsíðu Partar inni í vafranum
function SitePreview() {
  return (
    <div className="space-y-1.5 px-2.5 pt-2">
      <div className="flex items-center gap-1">
        <LogoMark size={10} />
        <span className="text-[7px] font-semibold text-white">Partar.</span>
      </div>
      <div className="h-2 w-24 rounded bg-white/85" />
      <div className="h-2 w-16 rounded bg-white/85" />
      <div className="mt-2 h-4 rounded-full border border-white/15 bg-white/5" />
      <div className="grid grid-cols-2 gap-1 pt-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="aspect-[4/3] rounded bg-white/10" />
        ))}
      </div>
    </div>
  );
}

// Heimaskjár: nokkur forrit og Partar sem birtist
function HomeScreen({ show }: { show: boolean }) {
  const colors = ["#3b82f6", "#22c55e", "#eab308", "#ef4444", "#a855f7", "#14b8a6", "#f97316", "#64748b"];
  return (
    <div
      className={`absolute inset-0 z-30 bg-[linear-gradient(160deg,#1e293b,#0f172a_60%,#111827)] px-3 pt-9 transition-opacity duration-300 ${show ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      <div className="grid grid-cols-4 gap-x-2 gap-y-3">
        {colors.map((c) => (
          <span key={c} className="aspect-square rounded-[9px] opacity-80" style={{ background: c }} />
        ))}
        <span className={`flex flex-col items-center gap-0.5 transition-all delay-300 duration-500 ease-[cubic-bezier(.34,1.56,.64,1)] ${show ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}>
          <LogoMark size={34} className="rounded-[9px] shadow-[0_0_0_2px_rgb(255_255_255/0.6)]" />
          <span className="text-[6.5px] font-medium text-white">Partar</span>
        </span>
      </div>
    </div>
  );
}

function IosScreens({ scene }: { scene: number }) {
  const { t } = useT();
  return (
    <>
      {/* Safari */}
      <div className={`absolute inset-0 bg-[#08090a] transition-opacity duration-300 ${scene >= 2 ? "opacity-0" : "opacity-100"}`}>
        <div className="h-4" />
        <SitePreview />
        <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-[#1c1c1e] px-3 pb-3 pt-1.5">
          <div className="mx-auto mb-1.5 h-4 w-[85%] rounded-md bg-white/10 text-center text-[6.5px] leading-4 text-white/70">partar.lukels255.com</div>
          <div className="flex items-center justify-between px-1 text-[#0a84ff]">
            <span className="text-[9px]">‹</span>
            <span className="text-[9px] opacity-40">›</span>
            <Share size={11} />
            <span className="text-[8px]">▢</span>
            <span className="text-[8px]">⧉</span>
          </div>
        </div>
        <Tap x="50%" y="95%" show={scene === 0} />
      </div>

      {/* Deilingarblað */}
      <div
        className={`absolute inset-x-0 bottom-0 z-10 rounded-t-xl bg-[#2c2c2e] px-2 pb-3 pt-2 transition-transform duration-500 ease-out ${
          scene === 1 ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto mb-2 h-1 w-8 rounded-full bg-white/25" />
        <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-white/5 p-1.5">
          <LogoMark size={16} />
          <span className="text-[7px] text-white">Partar – {t("notaðir varahlutir")}</span>
        </div>
        <div className="overflow-hidden rounded-lg bg-[#3a3a3c] text-[7.5px] text-white">
          <div className="border-b border-white/10 px-2 py-1.5">{t("Afrita")}</div>
          <div className="border-b border-white/10 px-2 py-1.5">{t("Bæta við leslista")}</div>
          <div className="flex items-center justify-between bg-white/10 px-2 py-1.5 font-medium">
            {t("Setja á heimaskjá")} <SquarePlus size={9} />
          </div>
          <div className="px-2 py-1.5">{t("Merkja")}</div>
        </div>
        <Tap x="45%" y="70%" show={scene === 1} />
      </div>

      {/* „Setja á heimaskjá“ glugginn */}
      <div className={`absolute inset-0 z-10 bg-[#1c1c1e] transition-opacity duration-300 ${scene === 2 ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <div className="flex items-center justify-between border-b border-white/10 px-2 pb-1.5 pt-5 text-[7px]">
          <span className="text-[#0a84ff]">{t("Hætta við")}</span>
          <span className="font-semibold text-white">{t("Setja á heimaskjá")}</span>
          <span className="font-semibold text-[#0a84ff]">{t("Bæta við")}</span>
        </div>
        <div className="m-2 flex items-center gap-2 rounded-lg bg-[#2c2c2e] p-2">
          <LogoMark size={26} />
          <div className="min-w-0 text-[7px]">
            <p className="border-b border-white/10 pb-1 text-white">Partar</p>
            <p className="pt-1 text-white/50">partar.lukels255.com</p>
          </div>
        </div>
        <Tap x="88%" y="9%" show={scene === 2} />
      </div>

      <HomeScreen show={scene === 3} />
    </>
  );
}

function AndroidScreens({ scene }: { scene: number }) {
  const { t } = useT();
  return (
    <>
      {/* Chrome */}
      <div className={`absolute inset-0 bg-[#08090a] transition-opacity duration-300 ${scene === 3 ? "opacity-0" : "opacity-100"}`}>
        <div className="flex items-center gap-1.5 bg-[#202124] px-2 pb-1.5 pt-4">
          <div className="h-4 flex-1 rounded-full bg-white/10 px-2 text-[6.5px] leading-4 text-white/70">partar.lukels255.com</div>
          <EllipsisVertical size={11} className="text-white/80" />
        </div>
        <SitePreview />
        <Tap x="94.5%" y="7.2%" show={scene === 0} />
      </div>

      {/* Valmynd */}
      <div
        className={`absolute right-1 top-4 z-10 w-[72%] origin-top-right rounded-md bg-[#2d2e31] py-1 text-[7.5px] text-white shadow-lg transition-all duration-300 ${
          scene === 1 ? "scale-100 opacity-100" : "pointer-events-none scale-90 opacity-0"
        }`}
      >
        <div className="px-2.5 py-1.5">{t("Nýr flipi")}</div>
        <div className="px-2.5 py-1.5">{t("Saga")}</div>
        <div className="px-2.5 py-1.5">{t("Niðurhal")}</div>
        <div className="bg-white/10 px-2.5 py-1.5 font-medium">{t("Setja upp forrit")}</div>
        <div className="px-2.5 py-1.5">{t("Stillingar")}</div>
        <Tap x="45%" y="70%" show={scene === 1} />
      </div>

      {/* Staðfesting */}
      <div className={`absolute inset-0 z-10 grid place-items-center bg-black/60 transition-opacity duration-300 ${scene === 2 ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <div className="relative w-[82%] rounded-xl bg-[#2d2e31] p-2.5 text-[7.5px] text-white">
          <p className="mb-2 font-semibold">{t("Setja upp forrit?")}</p>
          <div className="mb-2.5 flex items-center gap-1.5">
            <LogoMark size={18} />
            <span>Partar</span>
          </div>
          <div className="flex justify-end gap-3 font-medium text-[#8ab4f8]">
            <span>{t("Hætta við")}</span>
            <span>{t("Setja upp")}</span>
          </div>
          <Tap x="84%" y="84%" show={scene === 2} />
        </div>
      </div>

      <HomeScreen show={scene === 3} />
    </>
  );
}
