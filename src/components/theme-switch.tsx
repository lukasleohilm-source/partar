"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { THEME_COOKIE, type Theme } from "@/lib/lang";
import { useT } from "./lang-provider";

// Sól | tungl. Valið er vistað í vafraköku svo þjónninn birti rétt útlit strax (ekkert flökt).
export function ThemeSwitch({ className = "", small = false }: { className?: string; small?: boolean }) {
  const { t } = useT();
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  function choose(next: Theme) {
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.dataset.theme = next;
    // Litur vafrastikunnar (t.d. í síma) fylgir útlitinu
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "light" ? "#f7f7f6" : "#08090a");
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
          title={label}
          className={`grid ${small ? "size-6" : "size-8"} place-items-center rounded-full transition-colors ${
            theme === value ? "bg-orange-600 text-white shadow-sm" : "text-stone-600 hover:text-stone-900"
          }`}
        >
          <Icon size={small ? 13 : 16} strokeWidth={2.2} />
        </button>
      ))}
    </div>
  );
}
