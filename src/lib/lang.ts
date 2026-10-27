import { EN } from "./en";

// Tungumál viðmótsins. Íslenski textinn er lykillinn: t("Leita") skilar „Search“ á ensku.
// Vanti þýðingu birtist íslenskan, svo ekkert brotnar þótt nýr texti bætist við.
export type Lang = "is" | "en";
export const LANGS: Lang[] = ["is", "en"];
export const LANG_COOKIE = "partar_lang";

export type Vars = Record<string, string | number>;
export type T = (text: string, vars?: Vars) => string;

export function isLang(v: unknown): v is Lang {
  return v === "is" || v === "en";
}

export function translate(lang: Lang, text: string, vars?: Vars): string {
  let out = lang === "en" ? (EN[text] ?? text) : text;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v));
  return out;
}

export function makeT(lang: Lang): T {
  return (text, vars) => translate(lang, text, vars);
}
