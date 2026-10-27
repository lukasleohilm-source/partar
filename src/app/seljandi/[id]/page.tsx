import { CalendarDays, MapPin, Package, Star } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Avatar } from "@/components/avatar";
import { BackButton } from "@/components/listing/listing-actions";
import { ListingCard } from "@/components/listing/listing-card";
import { Stars } from "@/components/stars";
import { REGIONS, formatDate, formatDecimal, isRegion } from "@/lib/i18n";
import { LISTING_SUMMARY_SELECT, timeAgo, type ListingSummary } from "@/lib/listings";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/lang-server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getProfile = cache(async (id: string) => {
  if (!UUID_RE.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, display_name, region, created_at").eq("id", id).maybeSingle();
  return data;
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const profile = await getProfile((await params).id);
  const { t } = await getT();
  return { title: profile ? `${profile.display_name} – Partar` : `${t("Seljandi fannst ekki")} – Partar` };
}

// Opin síða seljanda: hver hann er, einkunnir og allar auglýsingar hans
export default async function SellerPage({ params }: { params: Promise<{ id: string }> }) {
  const { t, lang } = await getT();
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  const supabase = await createClient();
  const [listings, sold, { data: rating }, { data: reviews }] = await Promise.all([
    supabase
      .from("listings")
      .select(LISTING_SUMMARY_SELECT)
      .eq("seller_id", id)
      .eq("status", "active")
      .order("published_at", { ascending: false })
      .limit(60),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("seller_id", id).eq("status", "sold"),
    supabase.rpc("seller_rating", { p_seller: id }).single<{ average: number | null; total: number }>(),
    supabase
      .from("reviews")
      .select("stars, comment, created_at")
      .eq("seller_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  const active = ((listings.data ?? []) as ListingSummary[]).map((l) => ({
    ...l,
    listing_images: [...l.listing_images].sort((a, b) => a.sort - b.sort),
  }));
  const region = profile.region && isRegion(profile.region) ? t(REGIONS[profile.region]) : null;
  const withComments = (reviews ?? []).filter((r) => r.comment);

  return (
    <div className="mx-auto max-w-md px-4 pt-4 md:max-w-page md:px-8 md:pt-8">
      <div className="mb-3">
        <BackButton />
      </div>

      <section className="rounded-3xl bg-surface p-5 md:flex md:items-center md:gap-8 md:p-7">
        <div className="flex items-center gap-4">
          <Avatar name={profile.display_name} size={72} />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{profile.display_name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500">
              {region && (
                <span className="flex items-center gap-1">
                  <MapPin size={14} /> {region}
                </span>
              )}
              <span className="flex items-center gap-1">
                <CalendarDays size={14} />{" "}{t("Á Pörtum síðan")}{" "}{formatDate(new Date(profile.created_at), { day: false, year: true }, lang)}
              </span>
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 divide-x divide-line rounded-2xl bg-canvas py-3 text-center md:ml-auto md:mt-0 md:min-w-96">
          <div>
            <span className="block text-lg font-bold tabular-nums">{active.length}</span>
            <span className="block text-xs text-stone-500">{t("Til sölu")}</span>
          </div>
          <div>
            <span className="block text-lg font-bold tabular-nums">{sold.count ?? 0}</span>
            <span className="block text-xs text-stone-500">{t("Selt")}</span>
          </div>
          <div>
            <span className="flex items-center justify-center gap-1 text-lg font-bold tabular-nums">
              {rating?.total ? (
                <>
                  <Star size={16} className="fill-amber-400 text-amber-400" aria-hidden />
                  {formatDecimal(Number(rating.average), lang)}
                </>
              ) : (
                <span className="text-stone-400">–</span>
              )}
            </span>
            <span className="block text-xs text-stone-500">
              {rating?.total ? `${rating.total} ${t(rating.total === 1 ? "einkunn" : "einkunnir")}` : t("Engin einkunn")}
            </span>
          </div>
        </div>
      </section>

      <section className="mt-7">
        <h2 className="mb-3 text-lg font-bold tracking-tight">{t("Til sölu")}</h2>
        {active.length ? (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 md:gap-x-6 md:gap-y-8 lg:grid-cols-4 xl:grid-cols-5">
            {active.map((l, i) => (
              <li key={l.id}>
                <ListingCard listing={l} priority={i < 4} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl bg-surface p-8 text-center text-stone-500">
            <Package className="mx-auto mb-2 text-stone-400" size={32} />
            {t("Engar auglýsingar til sölu núna.")}
          </div>
        )}
      </section>

      {withComments.length > 0 && (
        <section className="mt-8 md:max-w-2xl">
          <h2 className="mb-3 text-lg font-bold tracking-tight">{t("Umsagnir")}</h2>
          <ul className="space-y-2">
            {withComments.map((r, i) => (
              <li key={i} className="rounded-2xl bg-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <Stars value={r.stars} size={15} lang={lang} />
                  <span className="text-xs text-stone-500">{timeAgo(r.created_at, Date.now(), lang)}</span>
                </div>
                <p className="mt-2 text-stone-800">„{r.comment}“</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
