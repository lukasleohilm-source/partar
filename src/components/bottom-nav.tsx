"use client";

import { BellRing, MessageCircle, Plus, Search, User, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "./lang-provider";
import { useUnreadCounts, type UnreadCounts } from "./use-unread-counts";

type Item = {
  href: string;
  label: string;
  icon: LucideIcon;
  primary?: boolean;
  badge?: keyof UnreadCounts;
  match: (p: string) => boolean;
};

const items: Item[] = [
  { href: "/", label: "Leit", icon: Search, match: (p) => p === "/" || p.startsWith("/leit") },
  { href: "/oska-eftir", label: "Óska eftir", icon: BellRing, badge: "notifications", match: (p) => p.startsWith("/oska-eftir") },
  { href: "/ny-auglysing", label: "Selja", icon: Plus, primary: true, match: (p) => p.startsWith("/ny-auglysing") },
  { href: "/skilabod", label: "Skilaboð", icon: MessageCircle, badge: "conversations", match: (p) => p.startsWith("/skilabod") },
  {
    href: "/profill",
    label: "Ég",
    icon: User,
    match: (p) => p.startsWith("/profill") || p.startsWith("/minar-auglysingar") || p.startsWith("/uppahalds"),
  },
];

// Síður sem eru á öllum skjánum (t.d. spjallþráður) fela valmyndina
const HIDDEN = [/^\/skilabod\/.+/, /^\/byrja/];

export function BottomNav() {
  const pathname = usePathname();
  const unread = useUnreadCounts();
  const { t } = useT();
  if (HIDDEN.some((r) => r.test(pathname))) return null;

  return (
    <nav
      aria-label={t("Aðalvalmynd")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.map((item) => {
          const active = item.match(pathname);
          const count = item.badge ? unread[item.badge] : 0;
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={count ? t("{label} ({count} ólesið)", { label: t(item.label), count }) : undefined}
                className={`flex flex-col items-center gap-1 pb-1.5 pt-2 text-[11px] font-medium transition-colors ${
                  active ? "text-orange-600" : "text-stone-500"
                }`}
              >
                {item.primary ? (
                  <span className="-mt-6 flex size-[52px] items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg shadow-orange-600/30 ring-4 ring-canvas transition active:scale-95">
                    <Icon size={26} strokeWidth={2.6} />
                  </span>
                ) : (
                  <span className="relative">
                    <Icon size={23} strokeWidth={active ? 2.4 : 1.9} />
                    {count > 0 && (
                      <span className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-orange-600 px-1 text-[10px] font-bold text-white ring-2 ring-surface">
                        {count > 9 ? "9+" : count}
                      </span>
                    )}
                  </span>
                )}
                {t(item.label)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
