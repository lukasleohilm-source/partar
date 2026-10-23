import { ChevronLeft, Heart } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ListingCard } from "@/components/listing/listing-card";
import { FavoriteButton } from "@/components/listing/listing-actions";
import { LISTING_SUMMARY_SELECT, type ListingSummary } from "@/lib/listings";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Uppáhalds – Partar" };

export default async function FavoritesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/byrja?next=/uppahalds");

  const { data } = await supabase
    .from("favorites")
    .select(`created_at, listings(${LISTING_SUMMARY_SELECT})`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<{ created_at: string; listings: ListingSummary | null }[]>();
  // Auglýsingar sem hafa verið fjarlægðar eða eru ekki lengur sýnilegar falla út
  const listings = (data ?? []).flatMap((f) => (f.listings ? [f.listings] : []));

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <header className="mb-4 flex items-center gap-2">
        <Link href="/profill" aria-label="Til baka" className="-ml-2 px-2 text-stone-600">
          <ChevronLeft size={26} />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Uppáhalds</h1>
      </header>

      {listings.length ? (
        <ul className="grid grid-cols-2 gap-3">
          {listings.map((l, i) => (
            <li key={l.id}>
              <ListingCard listing={l} priority={i < 4} favorite={<FavoriteButton listingId={l.id} initial />} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl bg-surface p-8 text-center shadow-sm">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <Heart size={28} />
          </div>
          <p className="font-semibold">Ekkert í uppáhalds enn</p>
          <p className="mt-1 text-sm text-stone-500">Ýttu á hjartað á auglýsingu til að vista hana hér.</p>
          <Link href="/leit" className="mt-4 inline-block font-semibold text-orange-600">
            Skoða auglýsingar →
          </Link>
        </div>
      )}
    </div>
  );
}
