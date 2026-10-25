import type { Condition, Kind, Region } from "@/lib/i18n";

// Myndir eru þegar minnkaðar við upphleðslu og fatan er opin, svo við vísum beint á þær
export function imageUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-images/${path}`;
}

// Mynd auglýsingar eins og hún er sótt úr listing_images
export type ImageRef = { path: string; thumb_path: string | null; color: string | null; sort: number };
export const IMAGE_COLS = "path, thumb_path, color, sort";

export function coverOf(images: ImageRef[] | null | undefined): ImageRef | null {
  return images?.length ? [...images].sort((a, b) => a.sort - b.sort)[0] : null;
}

// Smámynd fyrir spjöld (eldri myndir hafa enga og nota þá fullu stærðina)
export function thumbUrl(img: ImageRef): string {
  return imageUrl(img.thumb_path ?? img.path);
}

// Allar skrár myndar í geymslunni (full stærð + smámynd)
export function storagePaths(images: { path: string; thumb_path: string | null }[]): string[] {
  return images.flatMap((i) => (i.thumb_path ? [i.path, i.thumb_path] : [i.path]));
}

export type ListingSummary = {
  id: string;
  seller_id: string;
  title: string;
  kind: Kind;
  status: "active" | "sold";
  price_isk: number | null;
  condition: Condition;
  region: Region;
  postal_code: string | null;
  published_at: string;
  listing_images: ImageRef[];
};

// Dálkar fyrir auglýsingaspjöld
export const LISTING_SUMMARY_SELECT = `id, seller_id, title, kind, status, price_isk, condition, region, postal_code, published_at, listing_images(${IMAGE_COLS})`;

// Íslenskur afstæður tími (sjá i18n.ts)
export { timeAgo } from "./i18n";
