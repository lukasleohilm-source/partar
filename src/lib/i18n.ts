import type { Lang } from "./lang";

// Íslenskir textar fyrir enum-gildi úr gagnagrunninum (þýddir með t() í lang.ts)

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

// Þúsundaskil með punkti (á ensku kommu). Ekki Intl: sumir vafrar og Cloudflare Worker hafa ekki íslensk gögn.
export function formatNumber(n: number, lang: Lang = "is"): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, lang === "en" ? "," : ".");
}

export function formatPrice(price: number | null, lang: Lang = "is"): string {
  if (price === null) return lang === "en" ? "Make an offer" : "Tilboð";
  if (price === 0) return lang === "en" ? "Free" : "Gefins";
  return `${formatNumber(price, lang)} kr.`;
}

export function isRegion(v: unknown): v is Region {
  return typeof v === "string" && v in REGIONS;
}

// Dagsetningar og tími. Ekki Intl: Cloudflare Worker hefur ekki íslensk gögn og skilar ensku.
// Ísland er á UTC allt árið (enginn sumartími), svo UTC-gildin eru íslenskur tími.
const MONTHS = {
  is: ["janúar", "febrúar", "mars", "apríl", "maí", "júní", "júlí", "ágúst", "september", "október", "nóvember", "desember"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};
const MONTHS_SHORT = {
  is: ["jan.", "feb.", "mar.", "apr.", "maí", "jún.", "júl.", "ágú.", "sep.", "okt.", "nóv.", "des."],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};
const WEEKDAYS = {
  is: ["sunnudagur", "mánudagur", "þriðjudagur", "miðvikudagur", "fimmtudagur", "föstudagur", "laugardagur"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
};

export function formatTime(d: Date): string {
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export function formatDate(
  d: Date,
  opts: { month?: "long" | "short"; year?: boolean; day?: boolean; weekday?: boolean } = {},
  lang: Lang = "is",
): string {
  const { month = "long", year = false, day = true, weekday = false } = opts;
  const parts = [
    weekday ? `${WEEKDAYS[lang][d.getUTCDay()]},` : "",
    day ? (lang === "en" ? String(d.getUTCDate()) : `${d.getUTCDate()}.`) : "",
    (month === "short" ? MONTHS_SHORT : MONTHS)[lang][d.getUTCMonth()],
    year ? String(d.getUTCFullYear()) : "",
  ];
  return parts.filter(Boolean).join(" ");
}

// Eintala þegar talan endar á 1 (nema 11): „21 klukkustund“, „22 klukkustundum“
function unit(n: number, one: string, many: string): string {
  return `${n} ${n % 10 === 1 && n % 100 !== 11 ? one : many}`;
}

function unitEn(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"} ago`;
}

export function timeAgo(iso: string, now = Date.now(), lang: Lang = "is"): string {
  const seconds = Math.round((now - new Date(iso).getTime()) / 1000);
  const en = lang === "en";
  if (seconds < 60) return en ? "just now" : "rétt í þessu";
  const minutes = Math.round(seconds / 60);
  if (seconds < 3600) return en ? unitEn(minutes, "minute") : `fyrir ${unit(minutes, "mínútu", "mínútum")}`;
  const hours = Math.round(seconds / 3600);
  if (seconds < 86400) return en ? unitEn(hours, "hour") : `fyrir ${unit(hours, "klukkustund", "klukkustundum")}`;
  const days = Math.round(seconds / 86400);
  if (days === 1) return en ? "yesterday" : "í gær";
  if (days < 30) return en ? unitEn(days, "day") : `fyrir ${unit(days, "degi", "dögum")}`;
  return formatDate(new Date(iso), { year: true }, lang);
}

// Tugabrot með kommu („4,5“), á ensku með punkti
export function formatDecimal(n: number, lang: Lang = "is"): string {
  const s = String(Math.round(n * 10) / 10);
  return lang === "en" ? s : s.replace(".", ",");
}
