"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LangSwitch, useT } from "./lang-provider";
import { Logo } from "./logo";

const COLUMNS = [
  {
    title: "Markaður",
    links: [
      { href: "/leit", label: "Leita" },
      { href: "/leit?tegund=part", label: "Varahlutir" },
      { href: "/leit?tegund=parts_car", label: "Partabílar" },
      { href: "/leit?tegund=car", label: "Ódýrir bílar" },
    ],
  },
  {
    title: "Þitt svæði",
    links: [
      { href: "/ny-auglysing", label: "Selja" },
      { href: "/oska-eftir", label: "Óska eftir" },
      { href: "/skilabod", label: "Skilaboð" },
      { href: "/minar-auglysingar", label: "Mínar auglýsingar" },
    ],
  },
  {
    title: "Um Partar",
    links: [
      { href: "/skilmalar", label: "Skilmálar" },
      { href: "/personuvernd", label: "Persónuvernd" },
      { href: "/gagnaeyding", label: "Eyðing gagna" },
    ],
  },
];

const HIDDEN = [/^\/byrja/];

// Síðufótur í tölvu (í síma er neðri valmyndin í staðinn)
export function SiteFooter() {
  const { t } = useT();
  const pathname = usePathname();
  if (HIDDEN.some((r) => r.test(pathname))) return null;

  return (
    <footer className="mt-16 hidden overflow-hidden border-t border-line md:block">
      <div className="mx-auto grid max-w-page grid-cols-[1.4fr_repeat(3,1fr)] gap-10 px-8 py-14">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-stone-500">
            {t("Markaðstorg fyrir notaða varahluti, partabíla og ódýra bíla á Íslandi.")}
          </p>
          <LangSwitch className="mt-5" />
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={t(col.title)}>
            <p className="text-[13px] font-medium text-stone-900">{t(col.title)}</p>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-stone-500 transition-colors duration-150 hover:text-stone-900">
                    {t(l.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      {/* Nafnið í fullri breidd sem lokapunktur síðunnar */}
      <div aria-hidden className="mx-auto max-w-page select-none px-8">
        <p className="-mb-[0.22em] text-[clamp(120px,19vw,300px)] font-semibold leading-none tracking-[-0.06em] text-surface-3">
          Partar<span className="text-orange-600/40">.</span>
        </p>
      </div>
      <div className="relative border-t border-line bg-canvas">
        <div className="mx-auto flex max-w-page items-center justify-between px-8 py-5 text-[13px] text-stone-500">
          <span>© {new Date().getFullYear()} Partar</span>
          <span>{t("Gert á Íslandi")}</span>
        </div>
      </div>
    </footer>
  );
}
