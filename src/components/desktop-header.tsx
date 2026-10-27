"use client";

import { BellRing, Heart, MessageCircle, Plus, Search, User, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LangSwitch, useT } from "./lang-provider";
import { Logo } from "./logo";
import { useUnreadCounts, type UnreadCounts } from "./use-unread-counts";

type Item = { href: string; label: string; icon: LucideIcon; badge?: keyof UnreadCounts; match: (p: string) => boolean };

const items: Item[] = [
  { href: "/leit", label: "Leita", icon: Search, match: (p) => p.startsWith("/leit") },
  { href: "/oska-eftir", label: "Óska eftir", icon: BellRing, badge: "notifications", match: (p) => p.startsWith("/oska-eftir") },
  { href: "/skilabod", label: "Skilaboð", icon: MessageCircle, badge: "conversations", match: (p) => p.startsWith("/skilabod") },
];

const HIDDEN = [/^\/byrja/];

// Valmynd efst í tölvu (neðri valmyndin er aðeins í síma)
export function DesktopHeader() {
  const pathname = usePathname();
  const unread = useUnreadCounts("efst");
  const { t } = useT();
  if (HIDDEN.some((r) => r.test(pathname))) return null;

  const me = pathname.startsWith("/profill") || pathname.startsWith("/minar-auglysingar");
  const link = (active: boolean) =>
    `relative flex items-center gap-2 rounded-full px-3.5 py-2 text-[15px] font-semibold transition-colors ${
      active ? "bg-orange-500/10 text-orange-700" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
    }`;

  return (
    <header className="sticky top-0 z-40 hidden border-b border-line bg-surface/85 backdrop-blur-xl md:block">
      <div className="mx-auto flex h-16 max-w-page items-center gap-2 px-8">
        <Link href="/" aria-label={t("Partar forsíða")} className="mr-4 shrink-0">
          <Logo />
        </Link>
        <nav aria-label={t("Aðalvalmynd")} className="flex items-center gap-1">
          {items.map(({ href, label, icon: Icon, badge, match }) => {
            const count = badge ? unread[badge] : 0;
            return (
              <Link key={href} href={href} aria-current={match(pathname) ? "page" : undefined} className={link(match(pathname))}>
                <Icon size={18} /> {t(label)}
                {count > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-600 px-1.5 text-[11px] font-bold text-white">
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LangSwitch className="mr-1" />
          <Link href="/uppahalds" aria-label={t("Uppáhalds")} className={`${link(pathname.startsWith("/uppahalds"))} px-2.5`}>
            <Heart size={19} />
          </Link>
          <Link href="/profill" aria-current={me ? "page" : undefined} className={link(me)}>
            <User size={18} /> {t("Ég")}
          </Link>
          <Link
            href="/ny-auglysing"
            className="ml-2 flex items-center gap-1.5 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 px-4 py-2 text-[15px] font-bold text-white shadow-md shadow-orange-600/25 transition hover:brightness-105 active:scale-95"
          >
            <Plus size={18} strokeWidth={2.6} /> {t("Selja")}
          </Link>
        </div>
      </div>
    </header>
  );
}
