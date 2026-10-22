"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Leit", icon: "🔍", match: (p: string) => p === "/" || p.startsWith("/leit") },
  { href: "/oska-eftir", label: "Óska eftir", icon: "🙋", match: (p: string) => p.startsWith("/oska-eftir") },
  { href: "/ny-auglysing", label: "Selja", icon: "＋", primary: true, match: (p: string) => p.startsWith("/ny-auglysing") },
  { href: "/skilabod", label: "Skilaboð", icon: "💬", match: (p: string) => p.startsWith("/skilabod") },
  { href: "/profill", label: "Ég", icon: "👤", match: (p: string) => p.startsWith("/profill") || p.startsWith("/minar-auglysingar") },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Aðalvalmynd"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.map((item) => {
          const active = item.match(pathname);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${
                  active ? "font-semibold text-orange-600" : "text-stone-500"
                }`}
              >
                {item.primary ? (
                  <span className="-mt-5 flex size-12 items-center justify-center rounded-full bg-orange-600 text-2xl text-white shadow-md">
                    {item.icon}
                  </span>
                ) : (
                  <span className="text-xl leading-none" aria-hidden>
                    {item.icon}
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
