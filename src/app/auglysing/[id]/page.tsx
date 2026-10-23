import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ImageGallery } from "@/components/listing/image-gallery";
import { primaryButton, secondaryButton } from "@/components/ui/styles";
import { CONDITIONS, KINDS, REGIONS, formatNumber, formatPrice, type Condition, type Kind, type Region } from "@/lib/i18n";
import { imageUrl, timeAgo } from "@/lib/listings";
import { createClient } from "@/lib/supabase/server";
import { yearRange } from "@/lib/vehicles";
import { contactSeller, setListingStatus } from "./actions";
import { ReportListing } from "./report-listing";

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
  created_at: string;
  categories: { name: string } | null;
  listing_images: { path: string; sort: number }[];
  listing_fitments: {
    year_from: number | null;
    year_to: number | null;
    makes: { name: string };
    models: { name: string } | null;
  }[];
  profiles: { display_name: string; created_at: string };
};

const memberSince = new Intl.DateTimeFormat("is-IS", { month: "long", year: "numeric" });

const UUID_RE =/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getListing = cache(async (id: string) => {
  if (!UUID_RE.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select(
      `id, seller_id, kind, status, title, description, price_isk, condition, region, postal_code,
       part_number, license_plate, mileage_km, universal_fit, published_at, created_at,
       categories(name),
       listing_images(path, sort),
       listing_fitments(year_from, year_to, makes(name), models(name)),
       profiles(display_name, created_at)`,
    )
    .eq("id", id)
    .order("sort", { referencedTable: "listing_images" })
    .maybeSingle<ListingDetail>();
  return data;
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const listing = await getListing((await params).id);
  if (!listing) return { title: "Auglýsing fannst ekki – Partar" };
  const cover = listing.listing_images[0];
  return {
    title: `${listing.title} – ${formatPrice(listing.price_isk)} – Partar`,
    description: listing.description?.slice(0, 160) ?? `${KINDS[listing.kind]} · ${REGIONS[listing.region]}`,
    openGraph: cover ? { images: [imageUrl(cover.path)] } : undefined,
  };
}

export default async function ListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ villa?: string }>;
}) {
  const { id } = await params;
  const { villa } = await searchParams;
  const listing = await getListing(id);
  if (!listing || listing.status === "removed") notFound();

  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    { data: contact },
  ] = await Promise.all([
    supabase.auth.getUser(),
    // RLS skilar síma aðeins ef seljandi leyfir það
    supabase.from("profile_contacts").select("phone").eq("id", listing.seller_id).maybeSingle(),
  ]);

  const isOwner = user?.id === listing.seller_id;
  const isCar = listing.kind !== "part";
  const phone = contact?.phone ?? null;

  const facts: [string, string][] = [
    ["Tegund", KINDS[listing.kind]],
    ["Ástand", CONDITIONS[listing.condition]],
    ...(listing.categories ? [["Flokkur", listing.categories.name] as [string, string]] : []),
    ["Staðsetning", [listing.postal_code, REGIONS[listing.region]].filter(Boolean).join(" ")],
    ...(listing.mileage_km != null
      ? [["Akstur", `${formatNumber(listing.mileage_km)} km`] as [string, string]]
      : []),
    ...(listing.license_plate ? [["Bílnúmer", listing.license_plate] as [string, string]] : []),
    ...(listing.part_number ? [["Vörunúmer", listing.part_number] as [string, string]] : []),
  ];

  return (
    <article className="mx-auto max-w-md pb-28">
      <ImageGallery urls={listing.listing_images.map((i) => imageUrl(i.path))} title={listing.title} />

      <div className="space-y-5 px-4 pt-4">
        {villa && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {villa === "lokad" ? "Seljandinn tekur ekki við skilaboðum frá þér." : "Ekki tókst að hefja spjall. Reyndu aftur."}
          </p>
        )}
        <header>
          {listing.status === "sold" && (
            <span className="mb-2 inline-block rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">SELT</span>
          )}
          {listing.status === "draft" && (
            <span className="mb-2 inline-block rounded-full bg-stone-300 px-3 py-1 text-xs font-bold">Óbirt</span>
          )}
          <h1 className="text-xl font-bold leading-tight">{listing.title}</h1>
          <p className="mt-1 text-2xl font-bold text-orange-600">{formatPrice(listing.price_isk)}</p>
          <p className="mt-1 text-sm text-stone-500">
            Birt {timeAgo(listing.published_at ?? listing.created_at)}
          </p>
        </header>

        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-stone-200">
          {facts.map(([k, v]) => (
            <div key={k} className="bg-white px-4 py-3">
              <dt className="text-xs text-stone-500">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>

        <section>
          <h2 className="mb-2 font-semibold">{isCar ? "Bíllinn" : "Passar í"}</h2>
          {listing.universal_fit ? (
            <p className="rounded-xl bg-orange-50 px-4 py-3 text-sm">Passar í alla bíla</p>
          ) : listing.listing_fitments.length ? (
            <ul className="space-y-2">
              {listing.listing_fitments.map((f, i) => (
                <li key={i} className="rounded-xl bg-orange-50 px-4 py-3 text-sm">
                  <span className="font-medium">
                    {f.makes.name} {f.models?.name ?? (isCar ? "" : "– allar gerðir")}
                  </span>{" "}
                  · {yearRange(f.year_from, f.year_to)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-500">Ekki tilgreint.</p>
          )}
        </section>

        {listing.description && (
          <section>
            <h2 className="mb-2 font-semibold">Lýsing</h2>
            <p className="whitespace-pre-line break-words text-stone-800">{listing.description}</p>
          </section>
        )}

        <section className="flex items-center gap-3 rounded-2xl bg-white p-4">
          <div className="flex size-11 items-center justify-center rounded-full bg-stone-200 text-lg font-semibold">
            {listing.profiles.display_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium">{listing.profiles.display_name}</p>
            <p className="text-sm text-stone-500">Notandi síðan {memberSince.format(new Date(listing.profiles.created_at))}</p>
          </div>
        </section>

        {!isOwner && (
          <div className="text-center">
            <ReportListing listingId={listing.id} />
          </div>
        )}
      </div>

      {/* Aðgerðir fastar neðst, fyrir ofan aðalvalmyndina */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-md gap-2">
          {isOwner ? (
            <>
              <Link href={`/auglysing/${listing.id}/breyta`} className={`${primaryButton} flex-1 text-center`}>
                ✏️ Breyta
              </Link>
              <form action={setListingStatus.bind(null, listing.id, listing.status === "sold" ? "active" : "sold")} className="flex-1">
                <button type="submit" className={secondaryButton}>
                  {listing.status === "sold" ? "Aftur í sölu" : "Merkja selt"}
                </button>
              </form>
            </>
          ) : listing.status === "active" ? (
            <>
              <form action={contactSeller.bind(null, listing.id)} className="flex-1">
                <button type="submit" className={primaryButton}>
                  💬 Senda skilaboð
                </button>
              </form>
              {phone && (
                <a href={`tel:${phone.replace(/\s/g, "")}`} className={`${secondaryButton} flex-1 text-center`}>
                  📞 Hringja
                </a>
              )}
            </>
          ) : (
            <p className="w-full py-3 text-center text-stone-500">Þessi auglýsing er ekki lengur virk.</p>
          )}
        </div>
      </div>
    </article>
  );
}
