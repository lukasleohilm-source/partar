"use client";

import { BellRing, CircleHelp, Heart, MessageCircle, Plus, Search, User, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LangSwitch, useT } from "./lang-provider";
import { Logo } from "./logo";
import { useAuthStatus } from "./use-auth-status";
import { useUnreadCounts, type UnreadCounts } from "./use-unread-counts";

type Item = { href: string; label: string; icon: LucideIcon; badge?: keyof UnreadCounts; match: (p: string) => boolean };

const items: Item[] = [
  { href: "/leit", label: "Leita", icon: Search, match: (p) => p.startsWith("/leit") },
  { href: "/oska-eftir", label: "Óska eftir", icon: BellRing, badge: "notifications", match: (p) => p.startsWith("/oska-eftir") },
  { href: "/skilabod", label: "Skilaboð", icon: MessageCircle, badge: "conversations", match: (p) => p.startsWith("/skilabod") },
  // Auðvelt að sjá hvernig Partar virkar: selja, óska eftir, leita og kaupa
  { href: "/leidbeiningar", label: "Leiðbeiningar", icon: CircleHelp, match: (p) => p.startsWith("/leidbeiningar") },
];

const HIDDEN = [/^\/byrja/];
// Innskráningarsíðurnar hafa sitt eigið einfalda útlit (eins og á flestum síðum)
const AUTH_PAGES = [/^\/innskraning/, /^\/nyskraning/, /^\/gleymt-lykilord/, /^\/nytt-lykilord/];

// Valmynd efst í tölvu (neðri valmyndin er aðeins í síma)
export function DesktopHeader() {
  const pathname = usePathname();
  const unread = useUnreadCounts("efst");
  const { t } = useT();
  const auth = useAuthStatus();
  if (HIDDEN.some((r) => r.test(pathname)) || AUTH_PAGES.some((r) => r.test(pathname))) return null;
  // Eftir innskráningu er haldið áfram á sömu síðu
  const back = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
  const loginHref = `/innskraning${back}`;
  const signupHref = `/nyskraning${back}`;

  const me = pathname.startsWith("/profill") || pathname.startsWith("/minar-auglysingar");
  const link = (active: boolean) =>
    `relative flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
      active ? "bg-surface-3 text-stone-900" : "text-stone-500 hover:bg-surface-2 hover:text-stone-900"
    }`;

  return (
    <header className="sticky top-0 z-40 hidden border-b border-line bg-canvas/80 backdrop-blur-xl md:block">
      <div className="mx-auto flex h-16 max-w-page items-center gap-2 px-8">
        <Link href="/" aria-label={t("Partar forsíða")} className="mr-6 shrink-0 rounded-lg">
          <Logo />
        </Link>
        <nav aria-label={t("Aðalvalmynd")} className="flex items-center gap-1">
          {items.map(({ href, label, icon: Icon, badge, match }) => {
            const count = badge ? unread[badge] : 0;
            return (
              <Link key={href} href={href} aria-current={match(pathname) ? "page" : undefined} className={link(match(pathname))}>
                <Icon size={16} strokeWidth={1.75} /> {t(label)}
                {count > 0 && (
                  <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-orange-600 px-1 text-[11px] font-semibold tabular-nums text-white">
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LangSwitch className="mr-1" />
          {auth === "guest" ? (
            // Óinnskráð: eins og á flestum síðum, „Skrá inn“ og „Nýskráning“
            <>
              <Link href={loginHref} className="rounded-lg px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:bg-surface-2 hover:text-stone-900">
                {t("Skrá inn")}
              </Link>
              <Link
                href={signupHref}
                className="rounded-lg border border-line-strong px-3 py-1.5 text-sm font-medium text-stone-900 transition-colors hover:bg-surface-2"
              >
                {t("Nýskráning")}
              </Link>
            </>
          ) : (
            <>
              <Link href="/uppahalds" aria-label={t("Uppáhalds")} className={`${link(pathname.startsWith("/uppahalds"))} px-2.5`}>
                <Heart size={17} strokeWidth={1.75} />
              </Link>
              {/* Meðan lotan er lesin er plássið frátekið svo valmyndin hoppi ekki */}
              <Link href="/profill" aria-current={me ? "page" : undefined} className={`${link(me)} ${auth === "loading" ? "invisible" : ""}`}>
                <User size={16} strokeWidth={1.75} /> {t("Ég")}
              </Link>
            </>
          )}
          <Link
            href="/ny-auglysing"
            className="ml-2 flex items-center gap-1.5 rounded-lg bg-orange-600 px-3.5 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#e0560f] active:scale-[0.97]"
          >
            <Plus size={16} strokeWidth={2.25} /> {t("Selja")}
          </Link>
        </div>
      </div>
    </header>
  );
}
