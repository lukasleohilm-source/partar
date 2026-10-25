import { cookies } from "next/headers";
import { LANG_COOKIE, isLang, makeT, type Lang } from "./lang";

// Tungumál fyrir þjónshluta (server components og server actions), lesið úr vafrakökunni
export async function getLang(): Promise<Lang> {
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(v) ? v : "is";
}

export async function getT() {
  const lang = await getLang();
  return { lang, t: makeT(lang) };
}
