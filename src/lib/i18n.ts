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

const isk = new Intl.NumberFormat("is-IS");

export function formatPrice(price: number | null): string {
  if (price === null) return "Tilboð";
  if (price === 0) return "Gefins";
  return `${isk.format(price)} kr.`;
}

export function isRegion(v: unknown): v is Region {
  return typeof v === "string" && v in REGIONS;
}
