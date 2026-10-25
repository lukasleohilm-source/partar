import {
  ArrowUp,
  BadgeCheck,
  CarFront,
  CheckCircle2,
  Clock,
  Gauge,
  Hash,
  LayoutGrid,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Sparkles,
  Tag,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Avatar } from "@/components/avatar";
import { ImageGallery } from "@/components/listing/image-gallery";
import { BackButton, BumpButton, FavoriteButton, ShareButton } from "@/components/listing/listing-actions";
import { SellerRating } from "@/components/stars";
import { primaryButton, secondaryButton } from "@/components/ui/styles";
import { CONDITIONS, KINDS, REGIONS, formatDate, formatNumber, formatPrice, type Condition, type Kind, type Region } from "@/lib/i18n";
import { IMAGE_COLS, coverOf, imageUrl, timeAgo, type ImageRef } from "@/lib/listings";
import { placeLabel } from "@/lib/places";
import { createClient } from "@/lib/supabase/server";
import { yearRange } from "@/lib/vehicles";
import { contactSeller, setListingStatus } from "./actions";
import { ReportListing } from "./report-listing";
import { getT } from "@/lib/lang-server";

type ListingDetail = {
  id: string;
  seller_id: string;
  kind: Kind;
  status: "draft" | "active" | "sold" | "removed";
  title: string;
  description: string | null;
  price_isk: number | null;
  condition: Condition;
  region: Region;
  postal_code: string | null;
  part_number: string | null;
  license_plate: string | null;
  mileage_km: number | null;
  universal_fit: boolean;
  published_at: string | null;
  bumped_at: string | null;
  created_at: string;
  categories: { name: string } | null;
  listing_images: ImageRef[];
  listing_fitments: {
    make_id: number;
    model_id: number | null;
    year_from: number | null;
    year_to: number | null;
    makes: { name: string };
    models: { name: string } | null;
  }[];
  profiles: { display_name: string; created_at: string };
};



const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getListing = cache(async (id: string) => {
  if (!UUID_RE.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select(
      `id, seller_id, kind, status, title, description, price_isk, condition, region, postal_code,
       part_number, license_plate, mileage_km, universal_fit, published_at, bumped_at, created_at,
       categories(name),
       listing_images(${IMAGE_COLS}),
       listing_fitments(make_id, model_id, year_from, year_to, makes(name), models(name)),
       profiles!listings_seller_id_fkey(display_name, created_at)`,
    )
    .eq("id", id)
    .maybeSingle<ListingDetail>();
  return data;
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) return { title: "Auglýsing fannst ekki – Partar" };
  const title = `${listing.title} – ${formatPrice(listing.price_isk)}`;
  const description =
    listing.description?.slice(0, 160) ?? `${KINDS[listing.kind]} · ${placeLabel(listing.postal_code, listing.region)} · Partar`;
  return {
    title: `${title} – Partar`,
    description,
    alternates: { canonical: `/auglysing/${listing.id}` },
    // Deilimynd með verði og merki: /auglysing/[id]/opengraph-image
    openGraph: { title, description, type: "website", siteName: "Partar", locale: "is_IS" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ villa?: string }>;
}) {
  const { t, lang } = await getT();
  const { id } = await params;
  const { villa } = await searchParams;
  const listing = await getListing(id);
  if (!listing || listing.status === "removed") notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: contact }, { data: fav }] = await Promise.all([
    // RLS skilar síma aðeins ef seljandi leyfir það
    supabase.from("profile_contacts").select("phone").eq("id", listing.seller_id).maybeSingle(),
    user
      ? supabase.from("favorites").select("listing_id").eq("listing_id", listing.id).eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const isFavorite = Boolean(fav);

  // Vörugögn fyrir Google (schema.org/Product)
  const cover = coverOf(listing.listing_images);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: listing.description ?? undefined,
    image: cover ? [imageUrl(cover.path)] : undefined,
    sku: listing.part_number ?? undefined,
    itemCondition: listing.condition === "nytt" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
    offers:
      listing.price_isk != null
        ? {
            "@type": "Offer",
            price: listing.price_isk,
            priceCurrency: "ISK",
            availability: listing.status === "active" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
            areaServed: "IS",
          }
        : undefined,
  };

  const isOwner = user?.id === listing.seller_id;
  const isCar = listing.kind !== "part";
  const phone = contact?.phone ?? null;

  const facts: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Tag, label: t("Tegund"), value: t(KINDS[listing.kind]) },
    { icon: Sparkles, label: t("Ástand"), value: t(CONDITIONS[listing.condition]) },
    ...(listing.categories ? [{ icon: LayoutGrid, label: t("Flokkur"), value: t(listing.categories.name) }] : []),
    {
      icon: MapPin,
      label: t("Staðsetning"),
      value: listing.postal_code ? `${listing.postal_code} ${t(placeLabel(listing.postal_code, listing.region))}` : t(REGIONS[listing.region]),
    },
    ...(listing.mileage_km != null ? [{ icon: Gauge, label: t("Akstur"), value: `${formatNumber(listing.mileage_km, lang)} km` }] : []),
    ...(listing.license_plate ? [{ icon: Hash, label: t("Bílnúmer"), value: listing.license_plate }] : []),
    ...(listing.part_number ? [{ icon: Hash, label: t("Vörunúmer"), value: listing.part_number }] : []),
  ];

  return (
    <article className="mx-auto max-w-md pb-32 md:grid md:max-w-6xl md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] md:items-start md:gap-x-10 md:px-6 md:pb-12 md:pt-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="relative md:sticky md:top-24 md:row-span-2 md:overflow-hidden md:rounded-3xl">
        <ImageGallery images={[...listing.listing_images].sort((a, b) => a.sort - b.sort)} title={listing.title} />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between p-3">
          <BackButton />
          <div className="pointer-events-auto flex gap-2">
            <ShareButton title={listing.title} text={`${listing.title} – ${formatPrice(listing.price_isk, lang)}`} />
            {!isOwner && <FavoriteButton listingId={listing.id} initial={isFavorite} variant="overlay" />}
          </div>
        </div>
      </div>

      <div className="-mt-4 space-y-5 rounded-t-3xl bg-canvas px-4 pt-5 [position:relative] md:mt-0 md:rounded-none md:bg-transparent md:px-0 md:pt-0">
        {villa && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {villa === "lokad" ? t("Seljandinn tekur ekki við skilaboðum frá þér.") : t("Ekki tókst að hefja spjall. Reyndu aftur.")}
          </p>
        )}
        <header>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {listing.status === "sold" && (
              <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold text-white">{t("SELT")}</span>
            )}
            {listing.status === "draft" && (
              <span className="rounded-full bg-stone-300 px-2.5 py-0.5 text-xs font-bold">{t("Óbirt")}</span>
            )}
            {listing.bumped_at && listing.published_at && listing.bumped_at > listing.published_at && (
              <span className="flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                <ArrowUp size={12} />{" "}{t("Ýtt upp")}
              </span>
            )}
          </div>
          <h1 className="text-[22px] font-extrabold leading-tight tracking-tight md:text-3xl">{listing.title}</h1>
          <p className="mt-1 text-[28px] font-black tracking-tight text-orange-600">{formatPrice(listing.price_isk, lang)}</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-500">
            <Clock size={14} />{" "}{t("Birt")}{" "}{timeAgo(listing.published_at ?? listing.created_at, Date.now(), lang)}
          </p>
        </header>

        <dl className="grid grid-cols-2 gap-2">
          {facts.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-2.5 rounded-2xl bg-surface p-3 shadow-sm ring-1 ring-black/5">
              <Icon size={18} className="mt-0.5 shrink-0 text-orange-600" />
              <div className="min-w-0">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-stone-500">{label}</dt>
                <dd className="truncate font-semibold">{value}</dd>
              </div>
            </div>
          ))}
        </dl>

        <section>
          <h2 className="mb-2 text-lg font-bold tracking-tight">{isCar ? t("Bíllinn") : t("Passar í")}</h2>
          {listing.universal_fit ? (
            <p className="flex items-center gap-2 rounded-2xl bg-orange-50 px-4 py-3 text-sm font-medium text-orange-900">
              <CheckCircle2 size={18} className="text-orange-600" />{" "}{t("Passar í alla bíla")}
            </p>
          ) : listing.listing_fitments.length ? (
            <ul className="flex flex-wrap gap-2">
              {listing.listing_fitments.map((f, i) => (
                <li key={i}>
                  <Link
                    href={`/leit?merki=${f.make_id}${f.model_id ? `&gerd=${f.model_id}` : ""}`}
                    className="flex items-center gap-2 rounded-full bg-orange-50 py-2 pl-3 pr-3.5 text-sm text-orange-900 active:bg-orange-100"
                  >
                    <CarFront size={16} className="text-orange-600" />
                    <span className="font-semibold">
                      {f.makes.name} {f.models?.name ?? (isCar ? "" : t("– allar gerðir"))}
                    </span>
                    <span className="text-orange-700">{t(yearRange(f.year_from, f.year_to))}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-500">{t("Ekki tilgreint.")}</p>
          )}
        </section>

        {listing.description && (
          <section>
            <h2 className="mb-2 text-lg font-bold tracking-tight">{t("Lýsing")}</h2>
            <p className="whitespace-pre-line break-words leading-relaxed text-stone-800">{listing.description}</p>
          </section>
        )}

        <section className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center gap-3">
            <Avatar name={listing.profiles.display_name} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{listing.profiles.display_name}</p>
              <p className="text-sm text-stone-500">{t("Á Pörtum síðan")}{" "}{formatDate(new Date(listing.profiles.created_at), { day: false, year: true }, lang)}</p>
            </div>
          </div>
          <SellerRating sellerId={listing.seller_id} />
        </section>

        {!isOwner && (
          <div className="flex justify-center pb-2">
            <ReportListing listingId={listing.id} />
          </div>
        )}
      </div>

      {/* Aðgerðir fastar neðst, fyrir ofan aðalvalmyndina */}
      <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 px-3 md:sticky md:bottom-6 md:col-start-2 md:mt-6 md:px-0">
        <div className="mx-auto flex max-w-md gap-2 rounded-2xl bg-surface/95 p-2 shadow-xl ring-1 ring-black/10 backdrop-blur-xl md:max-w-none">
          {isOwner ? (
            <>
              <Link href={`/auglysing/${listing.id}/breyta`} className={`${primaryButton} flex flex-1 items-center justify-center gap-2`}>
                <Pencil size={18} />{" "}{t("Breyta")}
              </Link>
              {listing.status === "active" && <BumpButton listingId={listing.id} bumpedAt={listing.bumped_at} publishedAt={listing.published_at} />}
              <form action={setListingStatus.bind(null, listing.id, listing.status === "sold" ? "active" : "sold")} className="flex-1">
                <button type="submit" className={`${secondaryButton} flex items-center justify-center gap-2`}>
                  <BadgeCheck size={18} /> {listing.status === "sold" ? t("Í sölu") : t("Selt")}
                </button>
              </form>
            </>
          ) : listing.status === "active" ? (
            <>
              <form action={contactSeller.bind(null, listing.id)} className="flex-[2]">
                <button type="submit" className={`${primaryButton} flex items-center justify-center gap-2`}>
                  <MessageCircle size={19} />{" "}{t("Senda skilaboð")}
                </button>
              </form>
              {phone && (
                <a
                  href={`tel:${phone.replace(/\s/g, "")}`}
                  aria-label={t("Hringja í seljanda")}
                  className={`${secondaryButton} flex flex-1 items-center justify-center gap-2`}
                >
                  <Phone size={18} />{" "}{t("Hringja")}
                </a>
              )}
            </>
          ) : (
            <p className="w-full py-3 text-center text-stone-500">{t("Þessi auglýsing er ekki lengur virk.")}</p>
          )}
        </div>
      </div>
    </article>
  );
}
