"use client";

import { SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SearchBox } from "./search-box";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { inputClass, labelClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import { CONDITIONS, KINDS, REGIONS, formatNumber, type Condition, type Kind } from "@/lib/i18n";
import { SORTS, searchHref, type Filters, type Sort } from "@/lib/search";
import type { Category } from "@/lib/vehicles";
import { useT } from "@/components/lang-provider";

type Props = {
  filters: Filters;
  categories: Category[];
  activeCount: number;
};

export function SearchForm({ filters, categories, activeCount }: Props) {
  const { t, lang } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const parents = categories.filter((c) => c.parent_id === null);

  function go(next: Filters, q = filters.q) {
    setOpen(false);
    router.push(searchHref({ ...next, q: q?.trim() || undefined }));
  }

  function openSheet() {
    setDraft(filters);
    setOpen(true);
  }

  function toggleCondition(c: Condition) {
    const set = new Set(draft.conditions ?? []);
    if (set.has(c)) set.delete(c);
    else set.add(c);
    setDraft({ ...draft, conditions: set.size ? [...set] : undefined });
  }

  const priceInput = (key: "minPrice" | "maxPrice", label: string) => (
    <label className="block">
      <span className={labelClass}>{t(label)}</span>
      <input
        value={draft[key] != null ? formatNumber(draft[key]!, lang) : ""}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 9);
          setDraft({ ...draft, [key]: digits ? Number(digits) : undefined });
        }}
        inputMode="numeric"
        placeholder={t("kr.")}
        className={inputClass}
      />
    </label>
  );

  return (
    <>
      <div className="flex gap-2">
        <SearchBox defaultValue={filters.q ?? ""} onSearch={(q) => go(filters, q)} />
        <button
          type="button"
          onClick={openSheet}
          aria-label={activeCount ? `Síur (${activeCount} virkar)` : t("Síur")}
          className="relative flex size-[52px] shrink-0 items-center justify-center rounded-2xl border border-stone-200 bg-surface shadow-sm active:scale-95"
        >
          <SlidersHorizontal size={21} />
          {activeCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-orange-600 text-[11px] font-bold text-white ring-2 ring-canvas">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={t("Síur")}
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                setDraft({ sort: "newest", page: 1, make: filters.make, model: filters.model, year: filters.year, allCars: filters.allCars })
              }
              className={`${secondaryButton} flex-1`}
            >
              {t("Hreinsa")}
            </button>
            <button type="button" onClick={() => go(draft)} className={`${primaryButton} flex-[2]`}>
              {t("Sýna niðurstöður")}
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          <fieldset>
            <legend className={labelClass}>{t("Tegund auglýsingar")}</legend>
            <div className="grid grid-cols-4 gap-1 rounded-xl bg-stone-200 p-1">
              {([undefined, ...(Object.keys(KINDS) as Kind[])] as (Kind | undefined)[]).map((k) => (
                <button
                  key={k ?? "allt"}
                  type="button"
                  onClick={() => setDraft({ ...draft, kind: k, category: k && k !== "part" ? undefined : draft.category })}
                  aria-pressed={draft.kind === k}
                  className={`rounded-lg py-2 text-sm font-medium ${draft.kind === k ? "bg-surface shadow-sm" : "text-stone-600"}`}
                >
                  {k ? t(KINDS[k]) : t("Allt")}
                </button>
              ))}
            </div>
          </fieldset>

          {(!draft.kind || draft.kind === "part") && (
            <label className="block">
              <span className={labelClass}>{t("Flokkur")}</span>
              <select
                value={draft.category ?? ""}
                onChange={(e) => setDraft({ ...draft, category: e.target.value ? Number(e.target.value) : undefined })}
                className={inputClass}
              >
                <option value="">{t("Allir flokkar")}</option>
                {parents.map((p) => (
                  <optgroup key={p.id} label={t(p.name)}>
                    <option value={p.id}>{t("Allt í")}{" "}{t(p.name).toLowerCase()}</option>
                    {categories
                      .filter((c) => c.parent_id === p.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {t(c.name)}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </label>
          )}

          <div className="grid grid-cols-2 gap-3">
            {priceInput("minPrice", "Verð frá")}
            {priceInput("maxPrice", "Verð til")}
          </div>

          <fieldset>
            <legend className={labelClass}>{t("Ástand")}</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CONDITIONS) as Condition[]).map((c) => {
                const on = draft.conditions?.includes(c) ?? false;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCondition(c)}
                    aria-pressed={on}
                    className={`rounded-full border px-4 py-2 text-sm ${on ? "border-orange-600 bg-orange-600 text-white" : "border-stone-300 bg-surface"}`}
                  >
                    {t(CONDITIONS[c])}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <label className="block">
            <span className={labelClass}>{t("Landshluti")}</span>
            <select
              value={draft.region ?? ""}
              onChange={(e) => setDraft({ ...draft, region: (e.target.value || undefined) as Filters["region"] })}
              className={inputClass}
            >
              <option value="">{t("Allt landið")}</option>
              {Object.entries(REGIONS).map(([value, label]) => (
                <option key={value} value={value}>
                  {t(label)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={labelClass}>{t("Röðun")}</span>
            <select
              value={draft.sort}
              onChange={(e) => setDraft({ ...draft, sort: e.target.value as Sort })}
              className={inputClass}
            >
              {Object.entries(SORTS).map(([value, label]) => (
                <option key={value} value={value}>
                  {t(label)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </BottomSheet>
    </>
  );
}
