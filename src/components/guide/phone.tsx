"use client";

import { BellRing, ChevronLeft, Heart, MessageCircle, Plus, Search, User, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/lang-provider";
import { LogoMark } from "@/components/logo";

// Smáhlutir fyrir leiðbeiningamyndböndin: einfaldaður sími með Partar inni í, teiknaður í kóða.
// Allt er í prósentum/smáum pixlum svo það skalist með símanum.

export const ORANGE = "#ea580c";

/** Spilari: skiptir um senu á fresti meðan myndbandið sést; stöðvast við „minni hreyfingu“ */
// Hver sena stendur í 6 sek. svo fólk nái að lesa og sjá hvað gerist (var 3,2 sek.)
export function useDemoPlayer(count: number, sceneMs = 6000) {
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.35 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || !visible) return;
    const timer = setInterval(() => setScene((s) => (s + 1) % count), sceneMs);
    return () => clearInterval(timer);
  }, [playing, visible, count, sceneMs, scene]);

  return {
    ref,
    scene,
    playing,
    toggle: () => setPlaying((p) => !p),
    /** Hoppa í skref (t.d. þegar smellt er á skref í listanum) og halda áfram þaðan */
    jump: (i: number) => setScene(i),
  };
}

/** Símaramminn */
export function Phone({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative mx-auto aspect-[9/18.5] w-[230px] overflow-hidden rounded-[34px] border-[7px] border-stone-300 bg-[#0b0b0c] text-white shadow-[0_18px_40px_rgb(0_0_0/0.35)] dark:border-stone-400"
      aria-hidden
    >
      {/* Myndavélargat */}
      <span className="absolute left-1/2 top-1.5 z-40 h-3 w-14 -translate-x-1/2 rounded-full bg-black" />
      {children}
    </div>
  );
}

/** Einn skjár; dofnar inn þegar hann birtist */
export function Screen({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`absolute inset-0 pt-6 [animation:partar-fade_.35s_ease-out] ${className}`}>{children}</div>;
}

/** Fingurinn sem ýtir */
export function Tap({ x, y, delay = 0 }: { x: string; y: string; delay?: number }) {
  return (
    <span
      className="pointer-events-none absolute z-50 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/90 bg-white/35 opacity-0 shadow-[0_0_12px_rgb(255_255_255/0.4)] [animation:partar-tap_2.6s_ease-out_infinite]"
      style={{ left: x, top: y, animationDelay: `${delay}ms` }}
    />
  );
}

/** Texti sem skrifast inn staf fyrir staf */
export function Typed({ text, delay = 350, speed = 55 }: { text: string; delay?: number; speed?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      timer = setInterval(() => setN((v) => (v >= text.length ? v : v + 1)), speed);
    }, delay);
    return () => {
      clearTimeout(start);
      clearInterval(timer);
    };
  }, [text, delay, speed]);
  return (
    <>
      {text.slice(0, n)}
      {n < text.length && <span className="ml-px inline-block h-[1.1em] w-px translate-y-[0.15em] animate-pulse bg-orange-500" />}
    </>
  );
}

/** Efri stika með baktakka, titli og framvindu í forminu */
export function TopBar({ title, step, of }: { title: string; step?: number; of?: number }) {
  return (
    <div className="px-3">
      <div className="flex items-center gap-1.5 py-1.5">
        <ChevronLeft size={12} className="text-white/60" />
        <span className="flex-1 truncate text-[10px] font-semibold">{title}</span>
        {step != null && of != null && (
          <span className="text-[8px] tabular-nums text-white/50">
            {step}/{of}
          </span>
        )}
      </div>
      {step != null && of != null && (
        <div className="flex gap-0.5">
          {Array.from({ length: of }, (_, i) => (
            <span key={i} className="h-[3px] flex-1 rounded-full" style={{ background: i < step ? ORANGE : "rgb(255 255 255 / 0.12)" }} />
          ))}
        </div>
      )}
    </div>
  );
}

const NAV: { label: string; icon: LucideIcon }[] = [
  { label: "Leit", icon: Search },
  { label: "Óska eftir", icon: BellRing },
  { label: "Selja", icon: Plus },
  { label: "Skilaboð", icon: MessageCircle },
  { label: "Ég", icon: User },
];
/** x-hnit hvers takka í neðri valmyndinni, fyrir fingurinn */
export const NAV_X = ["10%", "30%", "50%", "70%", "90%"];
export const NAV_Y = "94.5%";

/** Neðri valmyndin eins og í appinu */
export function BottomNav({ active }: { active?: number }) {
  const { t } = useT();
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t border-white/10 bg-[#111213] px-1 pb-2.5 pt-1.5">
      {NAV.map(({ label, icon: Icon }, i) =>
        i === 2 ? (
          <span key={label} className="flex flex-col items-center gap-0.5">
            <span className="-mt-3 grid size-6 place-items-center rounded-full text-white shadow-md" style={{ background: ORANGE }}>
              <Icon size={13} strokeWidth={2.6} />
            </span>
            <span className="text-[6.5px] font-medium text-white/80">{t(label)}</span>
          </span>
        ) : (
          <span key={label} className={`flex flex-col items-center gap-0.5 ${active === i ? "text-orange-500" : "text-white/55"}`}>
            <Icon size={12} />
            <span className="text-[6.5px] font-medium">{t(label)}</span>
          </span>
        ),
      )}
    </div>
  );
}

/** Reitur í formi */
export function Field({ label, children, focus = false }: { label: string; children: React.ReactNode; focus?: boolean }) {
  return (
    <div>
      <p className="mb-0.5 text-[7.5px] font-medium text-white/60">{label}</p>
      <div
        className={`min-h-[22px] rounded-md border px-2 py-1 text-[9px] ${focus ? "border-orange-500 ring-2 ring-orange-500/25" : "border-white/12 bg-white/[0.03]"}`}
      >
        {children}
      </div>
    </div>
  );
}

/** Appelsínugulur aðalhnappur neðst á skjá */
export function PrimaryButton({ children, pressed = false }: { children: React.ReactNode; pressed?: boolean }) {
  return (
    <div className="absolute inset-x-3 bottom-4 z-10">
      <div
        className={`rounded-lg py-2 text-center text-[9.5px] font-semibold text-white transition-transform delay-700 duration-150 ${pressed ? "scale-95" : ""}`}
        style={{ background: ORANGE }}
      >
        {children}
      </div>
    </div>
  );
}

/** Mynd af hlut: litaður flötur með tákni (engar raunverulegar myndir) */
export function PartPhoto({ icon: Icon, hue, className = "" }: { icon: LucideIcon; hue: number; className?: string }) {
  return (
    <div
      className={`grid place-items-center overflow-hidden ${className}`}
      style={{ background: `linear-gradient(145deg, hsl(${hue} 30% 32%), hsl(${hue} 25% 16%))` }}
    >
      <Icon className="size-[42%] text-white/80" strokeWidth={1.5} />
    </div>
  );
}

/** Auglýsingaspjald eins og í leitinni */
export function MiniCard({
  icon,
  hue,
  title,
  price,
  heart = false,
}: {
  icon: LucideIcon;
  hue: number;
  title: string;
  price: string;
  heart?: boolean;
}) {
  return (
    <div className="relative">
      <PartPhoto icon={icon} hue={hue} className="aspect-[4/3] rounded-md" />
      <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-black/45">
        <Heart size={8} className={heart ? "fill-red-500 text-red-500 [animation:partar-pop_.4s_ease-out]" : "text-white"} />
      </span>
      <p className="mt-0.5 truncate text-[7.5px] font-medium">{title}</p>
      <p className="text-[8px] font-semibold tabular-nums">{price}</p>
    </div>
  );
}

/** Forsíðan í hnotskurn: merki, leit, „Minn bíll“ og nokkrar auglýsingar */
export function HomeScreen({ children }: { children?: React.ReactNode }) {
  const { t } = useT();
  return (
    <div className="px-3">
      <div className="flex items-center gap-1 py-1.5">
        <LogoMark size={12} />
        <span className="text-[10px] font-bold">Partar.</span>
      </div>
      <div className="flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1.5 text-[8px] text-white/45">
        <Search size={9} /> {t("Hvað vantar þig? t.d. framljós")}
      </div>
      {children}
    </div>
  );
}
