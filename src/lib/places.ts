import { REGIONS, type Region } from "@/lib/i18n";

// Póstnúmer → bæjarnafn og áætluð hnit (miðja þéttbýlis). Notað fyrir staðsetningu á spjöldum
// og fjarlægð. Sama gögn eru í töflunni public.postal_codes (sjá scripts/gen-postal-sql.mjs).
export const POSTAL: Record<string, [name: string, lat: number, lng: number]> = {
  "101": ["Reykjavík", 64.147, -21.94], "102": ["Reykjavík", 64.13, -21.94], "103": ["Reykjavík", 64.13, -21.89],
  "104": ["Reykjavík", 64.14, -21.88], "105": ["Reykjavík", 64.135, -21.9], "107": ["Reykjavík", 64.145, -21.97],
  "108": ["Reykjavík", 64.13, -21.87], "109": ["Reykjavík", 64.105, -21.85], "110": ["Reykjavík", 64.115, -21.79],
  "111": ["Reykjavík", 64.1, -21.83], "112": ["Reykjavík", 64.14, -21.79], "113": ["Reykjavík", 64.12, -21.75],
  "116": ["Kjalarnes", 64.22, -21.75], "170": ["Seltjarnarnes", 64.153, -21.995], "190": ["Vogar", 63.98, -22.38],
  "200": ["Kópavogur", 64.11, -21.91], "201": ["Kópavogur", 64.1, -21.89], "203": ["Kópavogur", 64.09, -21.85],
  "210": ["Garðabær", 64.088, -21.92], "220": ["Hafnarfjörður", 64.067, -21.957], "221": ["Hafnarfjörður", 64.06, -21.98],
  "225": ["Álftanes", 64.1, -22.0], "230": ["Reykjanesbær", 64.002, -22.56], "232": ["Reykjanesbær", 64.0, -22.55],
  "233": ["Reykjanesbær", 63.99, -22.6], "235": ["Keflavíkurflugvöllur", 63.98, -22.6], "240": ["Grindavík", 63.84, -22.43],
  "245": ["Sandgerði", 64.04, -22.71], "250": ["Garður", 64.07, -22.65], "260": ["Njarðvík", 63.98, -22.53],
  "270": ["Mosfellsbær", 64.167, -21.7], "271": ["Mosfellsbær", 64.17, -21.65], "276": ["Mosfellsbær", 64.2, -21.5],
  "300": ["Akranes", 64.32, -22.07], "301": ["Akranes", 64.35, -21.95], "310": ["Borgarnes", 64.54, -21.92],
  "311": ["Borgarnes", 64.6, -21.8], "320": ["Reykholt", 64.66, -21.29], "340": ["Stykkishólmur", 65.075, -22.73],
  "345": ["Flatey", 65.37, -22.92], "350": ["Grundarfjörður", 64.92, -23.25], "355": ["Ólafsvík", 64.89, -23.71],
  "356": ["Snæfellsbær", 64.83, -23.5], "360": ["Hellissandur", 64.91, -23.86], "370": ["Búðardalur", 65.11, -21.77],
  "371": ["Búðardalur", 65.2, -21.6], "380": ["Reykhólar", 65.45, -22.2], "400": ["Ísafjörður", 66.075, -23.13],
  "401": ["Ísafjörður", 66.05, -23.2], "410": ["Hnífsdalur", 66.11, -23.13], "415": ["Bolungarvík", 66.16, -23.25],
  "420": ["Súðavík", 66.03, -22.99], "425": ["Flateyri", 66.05, -23.51], "430": ["Suðureyri", 66.13, -23.53],
  "450": ["Patreksfjörður", 65.6, -23.99], "451": ["Patreksfjörður", 65.55, -23.8], "460": ["Tálknafjörður", 65.62, -23.82],
  "465": ["Bíldudalur", 65.69, -23.6], "470": ["Þingeyri", 65.88, -23.49], "471": ["Þingeyri", 65.85, -23.4],
  "500": ["Staður", 65.2, -21.1], "510": ["Hólmavík", 65.71, -21.68], "512": ["Hólmavík", 65.75, -21.5],
  "520": ["Drangsnes", 65.69, -21.45], "524": ["Árneshreppur", 66.03, -21.45], "530": ["Hvammstangi", 65.4, -20.94],
  "531": ["Hvammstangi", 65.35, -20.8], "540": ["Blönduós", 65.66, -20.29], "541": ["Blönduós", 65.6, -20.1],
  "545": ["Skagaströnd", 65.83, -20.32], "550": ["Sauðárkrókur", 65.75, -19.64], "551": ["Sauðárkrókur", 65.7, -19.5],
  "560": ["Varmahlíð", 65.55, -19.45], "565": ["Hofsós", 65.9, -19.41], "566": ["Hofsós", 65.85, -19.35],
  "570": ["Fljót", 66.0, -19.1], "580": ["Siglufjörður", 66.15, -18.91], "600": ["Akureyri", 65.68, -18.09],
  "601": ["Akureyri", 65.7, -18.2], "603": ["Akureyri", 65.7, -18.11], "607": ["Akureyri", 65.67, -18.1],
  "610": ["Grenivík", 65.95, -18.18], "611": ["Grímsey", 66.54, -18.0], "620": ["Dalvík", 65.97, -18.53],
  "621": ["Dalvík", 65.95, -18.45], "625": ["Ólafsfjörður", 66.07, -18.65], "630": ["Hrísey", 66.0, -18.38],
  "640": ["Húsavík", 66.04, -17.34], "641": ["Húsavík", 66.0, -17.2], "645": ["Fosshóll", 65.7, -17.55],
  "650": ["Laugar", 65.72, -17.37], "660": ["Mývatn", 65.64, -16.91], "670": ["Kópasker", 66.3, -16.45],
  "671": ["Kópasker", 66.2, -16.4], "675": ["Raufarhöfn", 66.45, -15.95], "680": ["Þórshöfn", 66.2, -15.33],
  "681": ["Þórshöfn", 66.15, -15.4], "685": ["Bakkafjörður", 66.03, -14.8], "690": ["Vopnafjörður", 65.76, -14.83],
  "700": ["Egilsstaðir", 65.265, -14.4], "701": ["Egilsstaðir", 65.3, -14.5], "710": ["Seyðisfjörður", 65.26, -14.01],
  "715": ["Mjóifjörður", 65.2, -13.8], "720": ["Borgarfjörður eystri", 65.53, -13.81], "730": ["Reyðarfjörður", 65.03, -14.22],
  "735": ["Eskifjörður", 65.07, -14.02], "740": ["Neskaupstaður", 65.15, -13.69], "750": ["Fáskrúðsfjörður", 64.93, -14.01],
  "755": ["Stöðvarfjörður", 64.83, -13.87], "760": ["Breiðdalsvík", 64.79, -14.01], "765": ["Djúpivogur", 64.66, -14.28],
  "780": ["Höfn", 64.25, -15.21], "781": ["Höfn", 64.3, -15.4], "785": ["Öræfi", 63.99, -16.65],
  "800": ["Selfoss", 63.93, -21.0], "801": ["Selfoss", 63.95, -20.9], "802": ["Selfoss", 63.9, -21.05],
  "803": ["Selfoss", 63.95, -20.85], "804": ["Selfoss", 64.05, -20.7], "805": ["Selfoss", 64.1, -20.95],
  "806": ["Selfoss", 64.15, -20.5], "810": ["Hveragerði", 64.0, -21.19], "815": ["Þorlákshöfn", 63.86, -21.37],
  "816": ["Ölfus", 63.95, -21.3], "820": ["Eyrarbakki", 63.86, -21.15], "825": ["Stokkseyri", 63.84, -21.06],
  "840": ["Laugarvatn", 64.21, -20.73], "845": ["Flúðir", 64.13, -20.31], "846": ["Flúðir", 64.15, -20.2],
  "850": ["Hella", 63.83, -20.4], "851": ["Hella", 63.8, -20.3], "860": ["Hvolsvöllur", 63.75, -20.23],
  "861": ["Hvolsvöllur", 63.7, -20.0], "870": ["Vík", 63.42, -19.01], "871": ["Vík", 63.5, -18.8],
  "880": ["Kirkjubæjarklaustur", 63.79, -18.05], "881": ["Kirkjubæjarklaustur", 63.75, -17.9], "900": ["Vestmannaeyjar", 63.44, -20.27],
};

// Áætluð miðja landshluta (þegar póstnúmer vantar)
export const REGION_CENTER: Record<Region, [number, number]> = {
  hofudborgarsvaedid: [64.12, -21.88],
  sudurnes: [63.99, -22.55],
  vesturland: [64.6, -22.0],
  vestfirdir: [65.9, -23.2],
  nordurland_vestra: [65.7, -19.9],
  nordurland_eystra: [65.75, -17.8],
  austurland: [65.15, -14.3],
  sudurland: [63.95, -20.6],
};

export function placeLabel(postal: string | null | undefined, region: Region): string {
  const p = postal ? POSTAL[postal] : undefined;
  return p ? p[0] : REGIONS[region];
}

export function coordsOf(postal: string | null | undefined, region: Region): [number, number] {
  const p = postal ? POSTAL[postal] : undefined;
  return p ? [p[1], p[2]] : REGION_CENTER[region];
}
