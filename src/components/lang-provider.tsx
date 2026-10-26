"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useMemo } from "react";
import { LANG_COOKIE, makeT, type Lang, type T } from "@/lib/lang";

type Theme = "light" | "dark";
const LangContext = createContext<{ lang: Lang; t: T; theme: Theme | null }>({ lang: "is", t: makeT("is"), theme: null });

// Tungumálið kemur frá þjóninum (vafrakaka) svo síðan birtist strax á réttu máli
// theme = þema sem notandinn valdi (vafrakaka), null = fylgja tækinu
export function LangProvider({ lang, theme = null, children }: { lang: Lang; theme?: Theme | null; children: React.ReactNode }) {
  const value = useMemo(() => ({ lang, t: makeT(lang), theme }), [lang, theme]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useT() {
  return useContext(LangContext);
}

// IS | EN rofi. Vistar valið í vafraköku í eitt ár og endurhleður þjónshlutana.
export function LangSwitch({ className = "" }: { className?: string }) {
  const { lang } = useT();
  const router = useRouter();

  function choose(next: Lang) {
    if (next === lang) return;
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = next;
    router.refresh();
  }

  return (
    <div role="group" aria-label="Tungumál / Language" className={`inline-flex rounded-full bg-stone-500/15 p-0.5 text-xs font-bold ${className}`}>
      {(["is", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => choose(l)}
          aria-pressed={lang === l}
          aria-label={l === "is" ? "Íslenska" : "English"}
          lang={l}
          className={`rounded-full px-2.5 py-1 uppercase transition-colors ${lang === l ? "bg-orange-600 text-white shadow-sm" : "text-stone-600 hover:text-stone-900"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
