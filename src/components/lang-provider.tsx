"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useMemo } from "react";
import { LANG_COOKIE, makeT, type Lang, type T } from "@/lib/lang";

const LangContext = createContext<{ lang: Lang; t: T }>({ lang: "is", t: makeT("is") });

// Tungumálið kemur frá þjóninum (vafrakaka) svo síðan birtist strax á réttu máli
export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const value = useMemo(() => ({ lang, t: makeT(lang) }), [lang]);
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
    <div role="group" aria-label="Tungumál / Language" className={`inline-flex rounded-full bg-stone-200/80 p-0.5 text-xs font-bold ${className}`}>
      {(["is", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => choose(l)}
          aria-pressed={lang === l}
          className={`rounded-full px-2.5 py-1 uppercase transition-colors ${lang === l ? "bg-stone-900 text-white" : "text-stone-600 hover:text-stone-900"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
