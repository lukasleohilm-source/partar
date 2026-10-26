import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { ListingCard } from "@/components/listing/listing-card";
import type { Kind } from "@/lib/i18n";
import { LISTING_SUMMARY_SELECT, type ListingSummary } from "@/lib/listings";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/lang-server";

type Props = {
  listingId: string;
  sellerId: string;
  sellerName: string;
  kind: Kind;
  categoryId: number | null;
  makeId: number | null;
};

const sortImages = (rows: ListingSummary[]) =>
  rows.map((r) => ({ ...r, listing_images: [...r.listing_images].sort((a, b) => a.sort - b.sort) }));

// „Fleiri frá seljanda“ og „Svipaðar auglýsingar“ neðst á auglýsingu
export async function RelatedListings({ listingId, sellerId, sellerName, kind, categoryId, makeId }: Props) {
  const { t } = await getT();
  const supabase = await createClient();
  const similarArgs = (strict: boolean) => ({
    p_kind: categoryId ? null : kind,
    p_category: categoryId,
    p_make: strict ? makeId : null,
    p_limit: 10,
  });

  const [fromSeller, strict] = await Promise.all([
    supabase
      .from("listings")
      .select(LISTING_SUMMARY_SELECT)
      .eq("seller_id", sellerId)
      .eq("status", "active")
      .neq("id", listingId)
      .order("published_at", { ascending: false })
      .limit(4),
    supabase.rpc("search_listings", similarArgs(Boolean(makeId))).select(LISTING_SUMMARY_SELECT),
  ]);

  // Of fáar í sama bíl → sami flokkur í öllum bílum
  let similarRows = ((strict.data ?? []) as ListingSummary[]).filter((l) => l.id !== listingId && l.seller_id !== sellerId);
  if (makeId && similarRows.length < 4) {
    const { data } = await supabase.rpc("search_listings", similarArgs(false)).select(LISTING_SUMMARY_SELECT);
    const more = ((data ?? []) as ListingSummary[]).filter(
      (l) => l.id !== listingId && l.seller_id !== sellerId && !similarRows.some((s) => s.id === l.id),
    );
    similarRows = [...similarRows, ...more];
  }
  const seller = sortImages((fromSeller.data ?? []) as ListingSummary[]);
  const similar = sortImages(similarRows.slice(0, 8));
  if (!seller.length && !similar.length) return null;

  return (
    <div className="space-y-8 border-t border-line px-4 pt-8 mt-8 md:mt-12 md:px-0 md:pt-10">
      {seller.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="truncate text-lg font-bold tracking-tight">{t("Fleiri frá")}{" "}{sellerName}</h2>
            <Link href={`/seljandi/${sellerId}`} className="flex shrink-0 items-center text-sm font-semibold text-orange-600">
              {t("Sjá allt")}{" "}<ChevronRight size={16} />
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
            {seller.map((l) => (
              <li key={l.id}>
                <ListingCard listing={l} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {similar.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold tracking-tight">{t("Svipaðar auglýsingar")}</h2>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
            {similar.map((l) => (
              <li key={l.id}>
                <ListingCard listing={l} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
