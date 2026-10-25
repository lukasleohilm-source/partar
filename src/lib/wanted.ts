import { KINDS, REGIONS, formatPrice, type Kind, type Region } from "@/lib/i18n";
import { makeT, type Lang } from "@/lib/lang";
import type { Filters } from "@/lib/search";
import { carLabel, type Category, type Make, type Model } from "@/lib/vehicles";

export type Wanted = {
  id: string;
  query: string | null;
  kind: Kind | null;
  category_id: number | null;
  make_id: number | null;
  model_id: number | null;
  year: number | null;
  max_price_isk: number | null;
  region: Region | null;
  active: boolean;
  created_at: string;
};

export const WANTED_SELECT = "id, query, kind, category_id, make_id, model_id, year, max_price_isk, region, active, created_at";

// Stutt lýsing á ósk, t.d. „framljós“ · Toyota Yaris 2008 · undir 20.000 kr.
export function describeWanted(w: Wanted, makes: Make[], models: Model[], categories: Category[], lang: Lang = "is"): string[] {
  const t = makeT(lang);
  const parts: string[] = [];
  if (w.kind) parts.push(t(KINDS[w.kind]));
  if (w.category_id) parts.push(t(categories.find((c) => c.id === w.category_id)?.name ?? "Flokkur"));
  if (w.make_id) parts.push(carLabel({ make: w.make_id, model: w.model_id, year: w.year }, makes, models));
  if (w.max_price_isk != null) parts.push(t("Hámark {verd}", { verd: formatPrice(w.max_price_isk, lang) }));
  parts.push(t(w.region ? REGIONS[w.region] : "Allt landið"));
  return parts;
}

export function wantedTitle(w: Wanted, makes: Make[], categories: Category[], lang: Lang = "is"): string {
  const t = makeT(lang);
  if (w.query) return `„${w.query}“`;
  const name = categories.find((c) => c.id === w.category_id)?.name;
  const category = name && t(name);
  const make = makes.find((m) => m.id === w.make_id)?.name;
  return [category, make].filter(Boolean).join(t(" í ")) || t("Ósk");
}

// Leitarsíur sem samsvara ósk (fyrir „Sjá það sem passar nú þegar“)
export function wantedToFilters(w: Wanted): Filters {
  return {
    q: w.query ?? undefined,
    kind: w.kind ?? undefined,
    category: w.category_id ?? undefined,
    make: w.make_id ?? undefined,
    model: w.model_id ?? undefined,
    year: w.year ?? undefined,
    maxPrice: w.max_price_isk ?? undefined,
    region: w.region ?? undefined,
    sort: "newest",
    page: 1,
  };
}
