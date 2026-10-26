"use client";

import { TrendingDown } from "lucide-react";
import Link from "next/link";
import { useT } from "@/components/lang-provider";
import { KINDS, formatPrice } from "@/lib/i18n";
import { coverOf, droppedFrom, timeAgo, type ListingSummary } from "@/lib/listings";
import { placeLabel } from "@/lib/places";
import { Thumb } from "./thumb";

export function ListingCard({
  listing,
  priority = false,
  distanceKm,
  favorite,
}: {
  listing: ListingSummary;
  priority?: boolean;
  distanceKm?: number | null;
  favorite?: React.ReactNode;
}) {
  const sold = listing.status === "sold";
  const { t, lang } = useT();
  const oldPrice = sold ? null : droppedFrom(listing);

  return (
    <div className="group relative">
      <Link
        href={`/auglysing/${listing.id}`}
        className="block overflow-hidden rounded-2xl bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.06),0_4px_16px_-8px_rgb(0_0_0/0.15)] ring-1 ring-black/5 transition active:scale-[0.98]"
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <Thumb image={coverOf(listing.listing_images)} eager={priority} className={`size-full ${sold ? "grayscale" : ""}`} />
          {listing.kind !== "part" && (
            <span className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
              {t(KINDS[listing.kind])}
            </span>
          )}
          {oldPrice != null && (
            <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
              <TrendingDown size={12} strokeWidth={2.6} /> {t("Verð lækkað")}
            </span>
          )}
          {sold && (
            <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-center text-xs font-bold tracking-wide text-white">
              {t("SELT")}
            </span>
          )}
        </div>
        <div className="p-3">
          <p className="flex flex-wrap items-baseline gap-x-1.5 text-[15px] font-extrabold tracking-tight text-orange-600">
            {formatPrice(listing.price_isk, lang)}
            {oldPrice != null && (
              <span className="text-xs font-medium text-stone-400 line-through">{formatPrice(oldPrice, lang)}</span>
            )}
          </p>
          <p className="mt-0.5 line-clamp-2 min-h-[2.5em] text-sm font-medium leading-snug text-stone-900">{listing.title}</p>
          <p className="mt-1.5 truncate text-xs text-stone-500">
            {t(placeLabel(listing.postal_code, listing.region))}
            {distanceKm != null && ` · ${distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)} km`} ·{" "}
            {timeAgo(listing.published_at, Date.now(), lang)}
          </p>
        </div>
      </Link>
      {favorite && <div className="absolute right-2 top-2">{favorite}</div>}
    </div>
  );
}
