import Link from "next/link";
import { KINDS, REGIONS, formatPrice } from "@/lib/i18n";
import { imageUrl, timeAgo, type ListingSummary } from "@/lib/listings";

export function ListingCard({ listing }: { listing: ListingSummary }) {
  const cover = listing.listing_images[0];

  return (
    <Link href={`/auglysing/${listing.id}`} className="block overflow-hidden rounded-2xl bg-white shadow-sm active:opacity-80">
      <div className="relative aspect-[4/3] bg-stone-200">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- myndir þegar minnkaðar við upphleðslu
          <img src={imageUrl(cover.path)} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-3xl text-stone-400">🔧</div>
        )}
        {listing.kind !== "part" && (
          <span className="absolute left-2 top-2 rounded-full bg-stone-900/80 px-2 py-0.5 text-[11px] font-medium text-white">
            {KINDS[listing.kind]}
          </span>
        )}
        {listing.status === "sold" && (
          <span className="absolute right-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white">
            SELT
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="font-bold text-orange-600">{formatPrice(listing.price_isk)}</p>
        <p className="line-clamp-2 text-sm font-medium leading-snug">{listing.title}</p>
        <p className="mt-1 truncate text-xs text-stone-500">
          {REGIONS[listing.region]} · {timeAgo(listing.published_at)}
        </p>
      </div>
    </Link>
  );
}
