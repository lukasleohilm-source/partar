// Viðmiðunarverð fyrir notaða varahluti á Íslandi, notuð þegar Partar á enn of fáar
// sambærilegar auglýsingar. Tekið saman í nóvember 2026 úr litlu úrtaki af opinberum
// verðum (með VSK). Aðeins bil og fjöldi eru birt, enginn texti eða myndir frá öðrum.
//
// Heimildir: Partasalinn.is (úrtak auglýstra verða hjá íslenskum partasölum),
// Vaka.is, Dekkjasalan.is, Kauptorg.is og opinberar Facebook Marketplace-færslur.
// Partasalinn.is er með mest nýlega bíla, svo eldri bílar eru oft neðst á bilinu.
//
// Uppfæra reglulega (t.d. á hálfs árs fresti) og þegar Partar á næg eigin gögn.

export const REFERENCE_AS_OF = "2026-11";

export type PriceReference = {
  /** Lykilorð í brotnu formi (sjá fold); passar ef orð í titli byrjar á því */
  keys: string[];
  /** Orð sem verða að passa nákvæmlega (t.d. „hurd“ en ekki „hurdarhandfang“) */
  exact?: string[];
  label: string;
  low: number;
  /** Algengasta verð; sleppt þar sem verðin skiptast í tvo hópa (t.d. gamlir og nýir gírkassar) */
  median: number | null;
  high: number;
  /** Fjöldi verða í úrtakinu */
  n: number;
  note?: string;
};

export const PRICE_REFERENCES: PriceReference[] = [
  { keys: ["framljos", "adalljos"], label: "framljós", low: 40000, median: 60000, high: 105000, n: 7, note: "LED-ljós í nýlegum bílum eru dýrust." },
  { keys: ["afturljos"], label: "afturljós", low: 12000, median: 15000, high: 20000, n: 5 },
  { keys: ["hlidarspeg", "spegill", "spegil"], label: "hliðarspegill", low: 15000, median: 21000, high: 30000, n: 6 },
  { keys: ["alternator", "altenator", "rafall"], label: "alternator", low: 15000, median: 25000, high: 32000, n: 8 },
  { keys: ["startar"], label: "startari", low: 12000, median: 15000, high: 20000, n: 7 },
  { keys: ["vatnskass"], label: "vatnskassi", low: 20000, median: 20000, high: 25000, n: 3 },
  { keys: ["studar"], label: "stuðari", low: 25000, median: 35000, high: 46000, n: 9 },
  { keys: [], exact: ["hurd", "framhurd", "afturhurd"], label: "hurð", low: 55000, median: 65000, high: 80000, n: 4 },
  { keys: ["girkass", "skipting"], label: "gírkassi", low: 35000, median: null, high: 120000, n: 5, note: "Eldri 5 gíra kassar eru neðst, nýlegir 6 gíra efst." },
  { keys: ["dempar"], label: "dempari", low: 10000, median: 15000, high: 19000, n: 13 },
  { keys: ["turbin"], label: "túrbína", low: 25000, median: null, high: 145000, n: 3, note: "Fer mjög eftir bíl og vél." },
  { keys: ["felg", "alfelg", "stalfelg"], label: "felgur (sett af 4)", low: 36000, median: 55000, high: 85000, n: 6, note: "Stálfelgur fást frá um 7.500 kr. stykkið; merkjafelgur á dekkjum fara langt yfir bilið." },
];

/** Sama „brotna“ form og public.fold() í gagnagrunninum: lágstafir, án kommu, ð→d, þ→th, æ→ae */
export function fold(text: string): string {
  return text
    .toLowerCase()
    .replace(/ð/g, "d")
    .replace(/þ/g, "th")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Finnur viðmið út frá titli auglýsingar (fyrsta tegund sem passar) */
export function matchReference(title: string): { ref: PriceReference; keyword: string } | null {
  const words = fold(title).split(/[^a-z0-9]+/).filter(Boolean);
  for (const ref of PRICE_REFERENCES) {
    for (const w of words) {
      if (ref.exact?.includes(w)) return { ref, keyword: w };
      const key = ref.keys.find((k) => w.startsWith(k));
      if (key) return { ref, keyword: key };
    }
  }
  return null;
}

/** Tenglar svo seljandinn geti borið saman sjálfur á öðrum sölusíðum */
export function compareLinks(query: string): { label: string; href: string }[] {
  const q = query.trim();
  const google = (site: string) => `https://www.google.com/search?q=${encodeURIComponent(`site:${site} ${q}`)}`;
  return [
    { label: "Partasalinn", href: google("partasalinn.is") },
    { label: "Bland", href: google("bland.is") },
    { label: "Facebook Marketplace", href: `https://www.facebook.com/marketplace/reykjavik/search/?query=${encodeURIComponent(q)}` },
  ];
}
