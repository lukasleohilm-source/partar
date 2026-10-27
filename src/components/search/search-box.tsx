"use client";

import { CarFront, LayoutGrid, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useT } from "@/components/lang-provider";
import { createClient } from "@/lib/supabase/client";

type Suggestion = {
  kind: "car" | "make" | "category" | "listing";
  label: string;
  make_id: number | null;
  model_id: number | null;
  category_id: number | null;
};

function hrefFor(s: Suggestion): string {
  if (s.kind === "car") return `/leit?merki=${s.make_id}&gerd=${s.model_id}`;
  if (s.kind === "make") return `/leit?merki=${s.make_id}`;
  if (s.kind === "category") return `/leit?flokkur=${s.category_id}`;
  return `/leit?q=${encodeURIComponent(s.label)}`;
}

const ICON = { car: CarFront, make: CarFront, category: LayoutGrid, listing: Search };
const HINT = { car: "Bíll", make: "Tegund", category: "Flokkur", listing: "" };

// Leitarreitur með uppástungum (bílar, flokkar, auglýsingar) á meðan skrifað er
export function SearchBox({
  defaultValue = "",
  onSearch,
  autoFocus = false,
}: {
  defaultValue?: string;
  onSearch?: (q: string) => void;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState(defaultValue);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [supabase] = useState(createClient);
  const { t } = useT();
  const seq = useRef(0);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setItems([]);
      return;
    }
    const n = ++seq.current;
    const timer = setTimeout(async () => {
      const { data } = await supabase.rpc("search_suggestions", { p_q: term });
      if (n === seq.current) setItems((data as Suggestion[] | null) ?? []);
    }, 160);
    return () => clearTimeout(timer);
  }, [q, supabase]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function submit() {
    const term = q.trim();
    if (active >= 0 && items[active]) return go(hrefFor(items[active]));
    if (onSearch) {
      setOpen(false);
      return onSearch(term);
    }
    go(term ? `/leit?q=${encodeURIComponent(term)}` : "/leit");
  }

  const showList = open && items.length > 0;

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="relative flex-1"
    >
      <Search size={19} strokeWidth={1.75} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" aria-hidden />
      <input
        type="search"
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!showList) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, items.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, -1));
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={t("Hvað vantar þig? t.d. framljós")}
        aria-label={t("Leita")}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        enterKeyHint="search"
        className="w-full rounded-full border border-line bg-surface py-3.5 pl-12 pr-24 text-base outline-none transition-colors duration-150 placeholder:text-stone-500 hover:border-line-strong focus:border-orange-600 focus:ring-4 focus:ring-orange-600/15 md:pr-28 [&::-webkit-search-cancel-button]:hidden"
      />
      {q && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            setItems([]);
          }}
          aria-label={t("Hreinsa")}
          className="absolute right-[4.5rem] top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-stone-200 text-stone-600 md:right-[5.5rem]"
        >
          <X size={15} />
        </button>
      )}

      <button
        type="submit"
        className="absolute right-1.5 top-1/2 flex h-[calc(100%-12px)] -translate-y-1/2 items-center gap-1.5 rounded-full bg-orange-600 px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#e0560f] active:scale-[0.97]"
      >
        <Search size={16} strokeWidth={2.25} aria-hidden />
        <span className="hidden md:inline">{t("Leita")}</span>
        <span className="sr-only md:hidden">{t("Leita")}</span>
      </button>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-line bg-surface-2 py-1 shadow-[0_8px_24px_rgb(0_0_0/0.5)]"
        >
          {items.map((s, i) => {
            const Icon = ICON[s.kind];
            return (
              <li key={`${s.kind}-${s.label}`} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => go(hrefFor(s))}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${i === active ? "bg-stone-100" : "active:bg-stone-100"}`}
                >
                  <Icon size={18} className="shrink-0 text-stone-400" />
                  <span className="min-w-0 flex-1 truncate">{s.kind === "category" ? t(s.label) : s.label}</span>
                  {HINT[s.kind] && <span className="shrink-0 text-xs text-stone-400">{t(HINT[s.kind])}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </form>
  );
}
