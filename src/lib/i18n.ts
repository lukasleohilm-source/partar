// Íslenskir textar fyrir enum-gildi úr gagnagrunninum

export const REGIONS = {
  hofudborgarsvaedid: "Höfuðborgarsvæðið",
  sudurnes: "Suðurnes",
  vesturland: "Vesturland",
  vestfirdir: "Vestfirðir",
  nordurland_vestra: "Norðurland vestra",
  nordurland_eystra: "Norðurland eystra",
  austurland: "Austurland",
  sudurland: "Suðurland",
} as const;
export type Region = keyof typeof REGIONS;

export const CONDITIONS = {
  nytt: "Nýtt",
  eins_og_nytt: "Eins og nýtt",
  gott: "Gott",
  notad: "Notað",
  gallad: "Gallað / í varahluti",
} as const;
export type Condition = keyof typeof CONDITIONS;

export const KINDS = {
  part: "Varahlutur",
  parts_car: "Partabíll",
  car: "Bíll",
} as const;
export type Kind = keyof typeof KINDS;

// Þúsundaskil með punkti. Ekki Intl: sumir vafrar hafa ekki íslensk gögn og nota þá kommu.
export function formatNumber(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatPrice(price: number | null): string {
  if (price === null) return "Tilboð";
  if (price === 0) return "Gefins";
  return `${formatNumber(price)} kr.`;
}

export function isRegion(v: unknown): v is Region {
  return typeof v === "string" && v in REGIONS;
}

// Dagsetningar og tími á íslensku. Ekki Intl: Cloudflare Worker hefur ekki íslensk gögn og skilar ensku.
// Ísland er á UTC allt árið (enginn sumartími), svo UTC-gildin eru íslenskur tími.
const MONTHS = ["janúar", "febrúar", "mars", "apríl", "maí", "júní", "júlí", "ágúst", "september", "október", "nóvember", "desember"];
const MONTHS_SHORT = ["jan.", "feb.", "mar.", "apr.", "maí", "jún.", "júl.", "ágú.", "sep.", "okt.", "nóv.", "des."];
const WEEKDAYS = ["sunnudagur", "mánudagur", "þriðjudagur", "miðvikudagur", "fimmtudagur", "föstudagur", "laugardagur"];

export function formatTime(d: Date): string {
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export function formatDate(d: Date, opts: { month?: "long" | "short"; year?: boolean; day?: boolean; weekday?: boolean } = {}): string {
  const { month = "long", year = false, day = true, weekday = false } = opts;
  const parts = [
    weekday ? `${WEEKDAYS[d.getUTCDay()]},` : "",
    day ? `${d.getUTCDate()}.` : "",
    (month === "short" ? MONTHS_SHORT : MONTHS)[d.getUTCMonth()],
    year ? String(d.getUTCFullYear()) : "",
  ];
  return parts.filter(Boolean).join(" ");
}

// Eintala þegar talan endar á 1 (nema 11): „21 klukkustund“, „22 klukkustundum“
function unit(n: number, one: string, many: string): string {
  return `${n} ${n % 10 === 1 && n % 100 !== 11 ? one : many}`;
}

export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.round((now - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "rétt í þessu";
  if (seconds < 3600) return `fyrir ${unit(Math.round(seconds / 60), "mínútu", "mínútum")}`;
  if (seconds < 86400) return `fyrir ${unit(Math.round(seconds / 3600), "klukkustund", "klukkustundum")}`;
  const days = Math.round(seconds / 86400);
  if (days === 1) return "í gær";
  if (days < 30) return `fyrir ${unit(days, "degi", "dögum")}`;
  return formatDate(new Date(iso), { year: true });
}

// Tugabrot með kommu („4,5“)
export function formatDecimal(n: number): string {
  return String(Math.round(n * 10) / 10).replace(".", ",");
}
