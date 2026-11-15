"use client";

import { ChevronRight, Wrench } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useT } from "@/components/lang-provider";
import { CATEGORY_ICONS } from "@/lib/category-icons";

export type CategoryRow = {
  id: number;
  parent_id: number | null;
  slug: string;
  name: string;
  sort: number;
};

// Flokkar á forsíðunni sem listi með „>“: smellt á flokk opnar undirflokkana (eins og tréð á mbl)
export function CategoryTree({ categories }: { categories: CategoryRow[] }) {
  const { t } = useT();
  // Einn „>“ á fyrirsögninni opnar og lokar öllum listanum (lokaður í byrjun)
  const [shown, setShown] = useState(false);
  const [open, setOpen] = useState<Set<number>>(new Set());
  const parents = categories.filter(
    (c) => c.parent_id === null && c.slug !== "annad",
  );
  const childrenOf = (id: number) =>
    categories
      .filter((c) => c.parent_id === id)
      .sort((a, b) => a.sort - b.sort);

  const toggle = (id: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <h2>
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-expanded={shown}
          aria-controls="flokkar-listi"
          className="flex w-full items-center gap-2 py-1 text-left text-xl font-semibold tracking-[-0.01em] text-stone-900"
        >
          {t("Flokkar")}
          <ChevronRight
            size={20}
            className={`text-stone-400 transition-transform duration-200 ${shown ? "rotate-90" : ""}`}
          />
        </button>
      </h2>
      {shown && (
        <ul
          id="flokkar-listi"
          className="mt-2 grid gap-x-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {parents.map((c) => {
            const Icon = CATEGORY_ICONS[c.slug] ?? Wrench;
            const kids = childrenOf(c.id);
            const isOpen = open.has(c.id);
            return (
              <li key={c.id} className="border-b border-line">
                {kids.length ? (
                  <button
                    type="button"
                    onClick={() => toggle(c.id)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-3 py-3.5 text-left transition-colors hover:text-stone-900"
                  >
                    <Icon
                      size={20}
                      strokeWidth={1.75}
                      className="shrink-0 text-orange-700"
                    />
                    <span className="flex-1 font-medium text-stone-900">
                      {t(c.name)}
                    </span>
                    <ChevronRight
                      size={18}
                      className={`shrink-0 text-stone-400 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                    />
                  </button>
                ) : (
                  <Link
                    href={`/leit?flokkur=${c.id}`}
                    className="flex items-center gap-3 py-3.5 hover:text-stone-900"
                  >
                    <Icon
                      size={20}
                      strokeWidth={1.75}
                      className="shrink-0 text-orange-700"
                    />
                    <span className="flex-1 font-medium text-stone-900">
                      {t(c.name)}
                    </span>
                    <ChevronRight
                      size={18}
                      className="shrink-0 text-stone-400"
                    />
                  </Link>
                )}

                {isOpen && (
                  <ul className="pb-3 pl-8">
                    <li>
                      <Link
                        href={`/leit?flokkur=${c.id}`}
                        className="block rounded-lg px-3 py-2 text-sm font-semibold text-orange-700 hover:bg-surface-2"
                      >
                        {t("Allt í {flokkur}", { flokkur: t(c.name) })}
                      </Link>
                    </li>
                    {kids.map((k) => (
                      <li key={k.id}>
                        <Link
                          href={`/leit?flokkur=${k.id}`}
                          className="block rounded-lg px-3 py-2 text-sm text-stone-700 hover:bg-surface-2 hover:text-stone-900"
                        >
                          {t(k.name)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
