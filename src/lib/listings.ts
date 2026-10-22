import type { Condition, Kind, Region } from "@/lib/i18n";

// Myndir eru þegar minnkaðar við upphleðslu og fatan er opin, svo við vísum beint á þær
export function imageUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-images/${path}`;
}

export type ListingSummary = {
  id: string;
  title: string;
  kind: Kind;
  status: "active" | "sold";
  price_isk: number | null;
  condition: Condition;
  region: Region;
  published_at: string;
  listing_images: { path: string }[];
};

// Dálkar fyrir auglýsingaspjöld; fyrsta myndin fylgir
export const LISTING_SUMMARY_SELECT =
  "id, title, kind, status, price_isk, condition, region, published_at, listing_images(path, sort)";

const rtf = new Intl.RelativeTimeFormat("is", { numeric: "auto" });
const dateFmt = new Intl.DateTimeFormat("is-IS", { day: "numeric", month: "long", year: "numeric" });

export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return "rétt í þessu";
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(seconds / 86400), "day");
  return dateFmt.format(new Date(iso));
}
