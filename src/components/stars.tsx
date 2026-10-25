import { Star } from "lucide-react";
import { formatDecimal } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/lang-server";
import { translate, type Lang } from "@/lib/lang";

export function Stars({ value, size = 16, lang = "is" }: { value: number; size?: number; lang?: Lang }) {
  return (
    <span className="inline-flex" aria-label={translate(lang, "{n} af 5 stjörnum", { n: formatDecimal(value, lang) })}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-stone-300"}
        />
      ))}
    </span>
  );
}

// Einkunn seljanda (meðaltal og fjöldi) ásamt nýjustu umsögnum
export async function SellerRating({ sellerId }: { sellerId: string }) {
  const { t, lang } = await getT();
  const supabase = await createClient();
  const [{ data: rating }, { data: reviews }] = await Promise.all([
    supabase.rpc("seller_rating", { p_seller: sellerId }).single<{ average: number | null; total: number }>(),
    supabase
      .from("reviews")
      .select("stars, comment, created_at")
      .eq("seller_id", sellerId)
      .not("comment", "is", null)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  if (!rating?.total) {
    return <p className="mt-3 text-sm text-stone-500">{t("Engar einkunnir enn.")}</p>;
  }
  return (
    <div className="mt-3 space-y-2">
      <p className="flex items-center gap-2 text-sm">
        <Stars value={Number(rating.average)} lang={lang} />
        <span className="font-semibold">{formatDecimal(Number(rating.average), lang)}</span>
        <span className="text-stone-500">
          ({rating.total} {t(rating.total === 1 ? "einkunn" : "einkunnir")})
        </span>
      </p>
      {reviews?.map((r, i) => (
        <blockquote key={i} className="rounded-xl bg-stone-100 px-3 py-2 text-sm text-stone-700">
          „{r.comment}“
        </blockquote>
      ))}
    </div>
  );
}
