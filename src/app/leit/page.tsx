import { ChevronLeft, ChevronRight, SearchX, X } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { ListingCard } from "@/components/listing/listing-card";
import { FavoriteButton } from "@/components/listing/listing-actions";
import { MyPlacePicker } from "@/components/search/my-place-picker";
import { MyCarPicker } from "@/components/search/my-car-picker";
import { SearchForm } from "@/components/search/search-form";
import { CONDITIONS, KINDS, REGIONS, formatPrice } from "@/lib/i18n";
import { favoriteIds } from "@/lib/favorites";
import { LISTING_SUMMARY_SELECT, type ListingSummary } from "@/lib/listings";
import { coordsOf, distanceKm } from "@/lib/places";
import {
  MY_CAR_COOKIE,
  MY_PLACE_COOKIE,
  PAGE_SIZE,
  SORTS,
  parseFilters,
  parseMyCar,
  parseMyPlace,
  searchHref,
  type Filters,
} from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import { carLabel } from "@/lib/vehicles";

export const metadata = { title: "Leit – Partar" };

type Row = ListingSummary;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseFilters(await searchParams);
  const jar = await cookies();
  const myCar = parseMyCar(jar.get(MY_CAR_COOKIE)?.value);
  const myPlace = parseMyPlace(jar.get(MY_PLACE_COOKIE)?.value);

  // Bíll í slóð gengur fyrir; annars „Minn bíll“ nema notandi hafi valið að sýna allt
  const urlCar = filters.make ? { make: filters.make, model: filters.model ?? null, year: filters.year ?? null } : null;
  const car = urlCar ?? (filters.allCars ? null : myCar);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const useDistance = Boolean(myPlace && (filters.sort === "distance" || filters.maxKm));
  const args = {
    q: filters.q,
    p_kind: filters.kind,
    p_category: filters.category,
    p_make: car?.make,
    p_model: car?.model ?? undefined,
    p_year: car?.year ?? undefined,
    p_min_price: filters.minPrice,
    p_max_price: filters.maxPrice,
    p_conditions: filters.conditions,
    p_region: filters.region,
    p_sort: filters.sort,
    p_limit: PAGE_SIZE + 1, // einni fleiri til að vita hvort næsta síða sé til
    p_offset: (filters.page - 1) * PAGE_SIZE,
    p_near: useDistance ? myPlace! : undefined,
    p_max_km: myPlace ? filters.maxKm : undefined,
  };
  // Ónotaðar breytur sleppt svo sjálfgefin gildi fallsins gildi
  const rpcArgs = Object.fromEntries(Object.entries(args).filter(([, v]) => v !== undefined));

  const [results, makes, models, categories, favs] = await Promise.all([
    supabase.rpc("search_listings", rpcArgs).select(LISTING_SUMMARY_SELECT),
    supabase.from("makes").select("id, name").order("name"),
    supabase.from("models").select("id, make_id, name").order("name"),
    supabase.from("categories").select("id, parent_id, name, sort").order("sort"),
    favoriteIds(supabase, user?.id),
  ]);
  const here = myPlace ? coordsOf(myPlace, "hofudborgarsvaedid") : null;

  const rows = ((results.data ?? []) as Row[]).map((r) => ({
    ...r,
    listing_images: [...r.listing_images].sort((a, b) => a.sort - b.sort),
  }));
  const hasMore = rows.length > PAGE_SIZE;
  const listings = rows.slice(0, PAGE_SIZE);
  const allMakes = makes.data ?? [];
  const allModels = models.data ?? [];
  const allCategories = categories.data ?? [];

  // Virkar síur sem merki sem hægt er að fjarlægja
  const chips: { label: string; href: string }[] = [];
  if (filters.q) chips.push({ label: `„${filters.q}“`, href: searchHref(filters, { q: undefined }) });
  if (filters.kind) chips.push({ label: KINDS[filters.kind], href: searchHref(filters, { kind: undefined }) });
  if (filters.category) {
    const name = allCategories.find((c) => c.id === filters.category)?.name ?? "Flokkur";
    chips.push({ label: name, href: searchHref(filters, { category: undefined }) });
  }
  if (filters.minPrice != null || filters.maxPrice != null) {
    const label =
      filters.minPrice != null && filters.maxPrice != null
        ? `${formatPrice(filters.minPrice)} – ${formatPrice(filters.maxPrice)}`
        : filters.minPrice != null
          ? `Frá ${formatPrice(filters.minPrice)}`
          : `Upp að ${formatPrice(filters.maxPrice!)}`;
    chips.push({ label, href: searchHref(filters, { minPrice: undefined, maxPrice: undefined }) });
  }
  if (filters.conditions) {
    chips.push({
      label: filters.conditions.map((c) => CONDITIONS[c]).join(", "),
      href: searchHref(filters, { conditions: undefined }),
    });
  }
  if (filters.region) chips.push({ label: REGIONS[filters.region], href: searchHref(filters, { region: undefined }) });
  if (filters.maxKm && myPlace) chips.push({ label: `Innan ${filters.maxKm} km`, href: searchHref(filters, { maxKm: undefined }) });
  if (filters.sort !== "newest") chips.push({ label: SORTS[filters.sort], href: searchHref(filters, { sort: "newest" }) });
  if (urlCar) {
    chips.push({
      label: carLabel(urlCar, allMakes, allModels),
      href: searchHref(filters, { make: undefined, model: undefined, year: undefined }),
    });
  }
  const activeCount = chips.length - (filters.q ? 1 : 0) - (urlCar ? 1 : 0);

  const pageHref = (page: number) => searchHref(filters, { page });
  const noCarFilters: Partial<Filters> = { allCars: true };

  return (
    <div className="mx-auto max-w-md space-y-3 px-4 pt-4">
      <h1 className="sr-only">Leit</h1>
      <SearchForm key={searchHref(filters)} filters={filters} categories={allCategories} activeCount={activeCount} />

      {!urlCar && (
        <MyCarPicker
          key={JSON.stringify(myCar)}
          makes={allMakes}
          models={allModels}
          car={myCar}
          active={Boolean(car)}
          toggleHref={myCar ? searchHref(filters, { allCars: !filters.allCars }) : undefined}
        />
      )}

      <div className="flex gap-2">
        <MyPlacePicker key={`${myPlace}-${filters.maxKm}`} place={myPlace} maxKm={filters.maxKm} />
      </div>

      {chips.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <li key={c.label}>
              <Link
                href={c.href}
                className="flex items-center gap-1.5 rounded-full bg-stone-900 py-1.5 pl-3 pr-2.5 text-sm text-white"
                aria-label={`Fjarlægja síu: ${c.label}`}
              >
                {c.label} <X size={14} aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {results.error ? (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          Leit mistókst. Reyndu aftur eftir smá stund.
        </p>
      ) : listings.length ? (
        <>
          <ul className="grid grid-cols-2 gap-3 pt-1">
            {listings.map((l) => (
              <li key={l.id}>
                <ListingCard
                  listing={l}
                  distanceKm={here ? distanceKm(here, coordsOf(l.postal_code, l.region)) : null}
                  favorite={l.seller_id !== user?.id && <FavoriteButton listingId={l.id} initial={favs.has(l.id)} />}
                />
              </li>
            ))}
          </ul>
          {(filters.page > 1 || hasMore) && (
            <nav aria-label="Síður" className="flex gap-2 pt-2">
              {filters.page > 1 && (
                <Link href={pageHref(filters.page - 1)} className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-stone-300 bg-surface py-3 font-medium">
                  <ChevronLeft size={18} /> Fyrri
                </Link>
              )}
              {hasMore && (
                <Link href={pageHref(filters.page + 1)} className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-stone-300 bg-surface py-3 font-medium">
                  Næsta <ChevronRight size={18} />
                </Link>
              )}
            </nav>
          )}
        </>
      ) : (
        <div className="rounded-2xl bg-surface p-8 text-center shadow-sm">
          <SearchX size={36} className="mx-auto mb-2 text-stone-400" />
          <p className="font-semibold">Ekkert fannst</p>
          <p className="mt-1 text-sm text-stone-500">Prófaðu færri síur eða önnur leitarorð.</p>
          {car && !urlCar && (
            <Link href={searchHref(filters, noCarFilters)} className="mt-3 block font-semibold text-orange-600">
              Leita í öllum bílum
            </Link>
          )}
          <Link
            href={searchHref(filters).replace(/^\/leit/, "/oska-eftir/ny")}
            className="mt-3 block font-semibold text-orange-600"
          >
            Skráðu ósk og fáðu tilkynningu →
          </Link>
        </div>
      )}
    </div>
  );
}
