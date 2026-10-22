"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUnreadCounts, type UnreadCounts } from "./use-unread-counts";

type Item = {
  href: string;
  label: string;
  icon: string;
  primary?: boolean;
  badge?: keyof UnreadCounts;
  match: (p: string) => boolean;
};

const items: Item[] = [
  { href: "/", label: "Leit", icon: "🔍", match: (p) => p === "/" || p.startsWith("/leit") },
  { href: "/oska-eftir", label: "Óska eftir", icon: "🙋", badge: "notifications", match: (p) => p.startsWith("/oska-eftir") },
  { href: "/ny-auglysing", label: "Selja", icon: "＋", primary: true, match: (p) => p.startsWith("/ny-auglysing") },
  { href: "/skilabod", label: "Skilaboð", icon: "💬", badge: "conversations", match: (p) => p.startsWith("/skilabod") },
  { href: "/profill", label: "Ég", icon: "👤", match: (p) => p.startsWith("/profill") || p.startsWith("/minar-auglysingar") },
];

export function BottomNav() {
  const pathname = usePathname();
  const unread = useUnreadCounts();

  return (
    <nav
      aria-label="Aðalvalmynd"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.map((item) => {
          const active = item.match(pathname);
          const count = item.badge ? unread[item.badge] : 0;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={count ? `${item.label} (${count} ólesið)` : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${
                  active ? "font-semibold text-orange-600" : "text-stone-500"
                }`}
              >
                {item.primary ? (
                  <span className="-mt-5 flex size-12 items-center justify-center rounded-full bg-orange-600 text-2xl text-white shadow-md">
                    {item.icon}
                  </span>
                ) : (
                  <span className="relative text-xl leading-none" aria-hidden>
                    {item.icon}
                    {count > 0 && (
                      <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-600 px-1 text-[10px] font-bold text-white">
                        {count > 9 ? "9+" : count}
                      </span>
                    )}
                  </span>
                )}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
