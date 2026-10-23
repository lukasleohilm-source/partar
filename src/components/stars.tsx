import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex" aria-label={`${value.toLocaleString("is-IS")} af 5 stjörnum`}>
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
    return <p className="mt-3 text-sm text-stone-500">Engar einkunnir enn.</p>;
  }
  return (
    <div className="mt-3 space-y-2">
      <p className="flex items-center gap-2 text-sm">
        <Stars value={Number(rating.average)} />
        <span className="font-semibold">{Number(rating.average).toLocaleString("is-IS")}</span>
        <span className="text-stone-500">
          ({rating.total} {rating.total === 1 ? "einkunn" : "einkunnir"})
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
