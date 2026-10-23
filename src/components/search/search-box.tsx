"use client";

import { CarFront, LayoutGrid, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
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
  const seq = useRef(0);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setItems([]);
      return;
    }
    const n = ++seq.current;
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("search_suggestions", { p_q: term });
      if (n === seq.current) setItems((data as Suggestion[] | null) ?? []);
    }, 160);
    return () => clearTimeout(t);
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
      <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" aria-hidden />
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
        placeholder="Hvað vantar þig? t.d. framljós"
        aria-label="Leita"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        enterKeyHint="search"
        className="w-full rounded-2xl border border-stone-200 bg-surface py-3.5 pl-12 pr-11 text-base shadow-sm outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/15 [&::-webkit-search-cancel-button]:hidden"
      />
      {q && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            setItems([]);
          }}
          aria-label="Hreinsa"
          className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-stone-200 text-stone-600"
        >
          <X size={15} />
        </button>
      )}

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl bg-surface py-1 shadow-xl ring-1 ring-black/10"
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
                  <span className="min-w-0 flex-1 truncate">{s.label}</span>
                  {HINT[s.kind] && <span className="shrink-0 text-xs text-stone-400">{HINT[s.kind]}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </form>
  );
}
