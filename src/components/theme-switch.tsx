"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { THEME_COOKIE } from "@/lib/lang";
import { useT } from "./lang-provider";

export type Theme = "light" | "dark";

// Ljóst | dökkt rofi. Valið er vistað í vafraköku svo þjónninn setji rétt þema strax (ekkert flökt).
// Án vals fylgir síðan stillingu tækisins og rofinn sýnir það sem er í gildi.
export function ThemeSwitch({ className = "" }: { className?: string }) {
  const { t, theme: initial } = useT();
  const [theme, setTheme] = useState<Theme | null>(initial);

  useEffect(() => {
    if (initial) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    // Fylgir tækinu þar til notandinn velur sjálfur
    const sync = () => {
      if (!document.documentElement.dataset.theme) setTheme(mq.matches ? "dark" : "light");
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [initial]);

  function choose(next: Theme) {
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.dataset.theme = next;
    setTheme(next);
  }

  const options = [
    { value: "light" as const, icon: Sun, label: t("Ljóst útlit") },
    { value: "dark" as const, icon: Moon, label: t("Dökkt útlit") },
  ];

  return (
    <div role="group" aria-label={t("Útlit")} className={`inline-flex rounded-full bg-stone-500/15 p-0.5 ${className}`}>
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => choose(value)}
          aria-pressed={theme === value}
          aria-label={label}
          className={`grid size-6 place-items-center rounded-full transition-colors ${
            theme === value ? "bg-orange-600 text-white shadow-sm" : "text-stone-600 hover:text-stone-900"
          }`}
        >
          <Icon size={14} strokeWidth={2.4} />
        </button>
      ))}
    </div>
  );
}
