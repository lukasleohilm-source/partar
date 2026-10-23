import { CONDITIONS, KINDS, REGIONS, type Condition, type Kind, type Region } from "@/lib/i18n";

// Slóðarbreytur leitar (íslensk heiti svo slóðin sé læsileg)
export type Filters = {
  q?: string;
  kind?: Kind; // tegund
  category?: number; // flokkur
  make?: number; // merki
  model?: number; // gerd
  year?: number; // argerd
  minPrice?: number; // verd_fra
  maxPrice?: number; // verd_til
  conditions?: Condition[]; // astand=gott,notad
  region?: Region; // landshluti
  maxKm?: number; // innan (km frá „Minn staður“)
  sort: Sort; // rodun
  page: number; // sida
  allCars?: boolean; // bill=allir: hunsa „Minn bíll“
};

export const SORTS = {
  newest: "Nýjast fyrst",
  price_asc: "Lægsta verð",
  price_desc: "Hæsta verð",
  distance: "Næst mér",
} as const;
export type Sort = keyof typeof SORTS;

export const PAGE_SIZE = 24;

type Params = Record<string, string | string[] | undefined>;

function str(p: Params, key: string): string | undefined {
  const v = p[key];
  const s = (Array.isArray(v) ? v[0] : v)?.trim();
  return s || undefined;
}

function int(p: Params, key: string, max = 1_000_000_000): number | undefined {
  const s = str(p, key);
  if (!s || !/^\d+$/.test(s)) return undefined;
  const n = Number(s);
  return n <= max ? n : undefined;
}

export function parseFilters(p: Params): Filters {
  const kind = str(p, "tegund");
  const region = str(p, "landshluti");
  const sort = str(p, "rodun");
  const conditions = (str(p, "astand") ?? "")
    .split(",")
    .filter((c): c is Condition => c in CONDITIONS);

  return {
    q: str(p, "q")?.slice(0, 100),
    kind: kind && kind in KINDS ? (kind as Kind) : undefined,
    category: int(p, "flokkur"),
    make: int(p, "merki"),
    model: int(p, "gerd"),
    year: int(p, "argerd", 2100),
    minPrice: int(p, "verd_fra"),
    maxPrice: int(p, "verd_til"),
    conditions: conditions.length ? conditions : undefined,
    region: region && region in REGIONS ? (region as Region) : undefined,
    maxKm: int(p, "innan", 1000),
    sort: sort && sort in SORTS ? (sort as Sort) : "newest",
    page: Math.max(1, int(p, "sida", 1000) ?? 1),
    allCars: str(p, "bill") === "allir",
  };
}

// Býr til slóð fyrir /leit; `patch` breytir einstökum gildum (undefined fjarlægir)
export function searchHref(f: Filters, patch: Partial<Filters> = {}): string {
  const m = { ...f, page: 1, ...patch };
  const sp = new URLSearchParams();
  if (m.q) sp.set("q", m.q);
  if (m.kind) sp.set("tegund", m.kind);
  if (m.category) sp.set("flokkur", String(m.category));
  if (m.make) sp.set("merki", String(m.make));
  if (m.model) sp.set("gerd", String(m.model));
  if (m.year) sp.set("argerd", String(m.year));
  if (m.minPrice != null) sp.set("verd_fra", String(m.minPrice));
  if (m.maxPrice != null) sp.set("verd_til", String(m.maxPrice));
  if (m.conditions?.length) sp.set("astand", m.conditions.join(","));
  if (m.region) sp.set("landshluti", m.region);
  if (m.maxKm) sp.set("innan", String(m.maxKm));
  if (m.sort !== "newest") sp.set("rodun", m.sort);
  if (m.allCars) sp.set("bill", "allir");
  if (m.page > 1) sp.set("sida", String(m.page));
  const qs = sp.toString();
  return qs ? `/leit?${qs}` : "/leit";
}

// ===== „Minn bíll“ (vafrakaka, virkar án innskráningar) =====

export const MY_CAR_COOKIE = "minn_bill";

export type MyCar = { make: number; model: number | null; year: number | null };

export function parseMyCar(raw: string | undefined): MyCar | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(decodeURIComponent(raw));
    if (!Number.isInteger(v?.make)) return null;
    return {
      make: v.make,
      model: Number.isInteger(v.model) ? v.model : null,
      year: Number.isInteger(v.year) ? v.year : null,
    };
  } catch {
    return null;
  }
}

export function serializeMyCar(car: MyCar | null): string {
  const maxAge = car ? 60 * 60 * 24 * 365 : 0;
  const value = car ? encodeURIComponent(JSON.stringify(car)) : "";
  return `${MY_CAR_COOKIE}=${value}; path=/; max-age=${maxAge}; samesite=lax`;
}

// ===== „Minn staður“ (póstnúmer, fyrir fjarlægð) =====

export const MY_PLACE_COOKIE = "minn_stadur";
export const DISTANCES = [10, 25, 50, 100, 200] as const;

export function parseMyPlace(raw: string | undefined): string | null {
  return raw && /^\d{3}$/.test(raw) ? raw : null;
}

export function serializeMyPlace(postal: string | null): string {
  const maxAge = postal ? 60 * 60 * 24 * 365 : 0;
  return `${MY_PLACE_COOKIE}=${postal ?? ""}; path=/; max-age=${maxAge}; samesite=lax`;
}