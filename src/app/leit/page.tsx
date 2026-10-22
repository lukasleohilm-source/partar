import Link from "next/link";
import { cookies } from "next/headers";
import { ListingCard } from "@/components/listing/listing-card";
import { MyCarPicker } from "@/components/search/my-car-picker";
import { SearchForm } from "@/components/search/search-form";
import { CONDITIONS, KINDS, REGIONS, formatPrice } from "@/lib/i18n";
import { LISTING_SUMMARY_SELECT, type ListingSummary } from "@/lib/listings";
import { MY_CAR_COOKIE, PAGE_SIZE, SORTS, parseFilters, parseMyCar, searchHref, type Filters } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import { carLabel } from "@/lib/vehicles";

export const metadata = { title: "Leit – Partar" };

type Row = Omit<ListingSummary, "listing_images"> & { listing_images: { path: string; sort: number }[] };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseFilters(await searchParams);
  const myCar = parseMyCar((await cookies()).get(MY_CAR_COOKIE)?.value);

  // Bíll í slóð gengur fyrir; annars „Minn bíll“ nema notandi hafi valið að sýna allt
  const urlCar = filters.make ? { make: filters.make, model: filters.model ?? null, year: filters.year ?? null } : null;
  const car = urlCar ?? (filters.allCars ? null : myCar);

  const supabase = await createClient();
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
  };
  // Ónotaðar breytur sleppt svo sjálfgefin gildi fallsins gildi
  const rpcArgs = Object.fromEntries(Object.entries(args).filter(([, v]) => v !== undefined));

  const [results, makes, models, categories] = await Promise.all([
    supabase.rpc("search_listings", rpcArgs).select(LISTING_SUMMARY_SELECT),
    supabase.from("makes").select("id, name").order("name"),
    supabase.from("models").select("id, make_id, name").order("name"),
    supabase.from("categories").select("id, parent_id, name, sort").order("sort"),
  ]);

  const rows = ((results.data ?? []) as Row[]).map((r) => ({
    ...r,
    listing_images: [...r.listing_images].sort((a, b) => a.sort - b.sort).slice(0, 1),
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
  if (filters.sort !== "newest") chips.push({ label: SORTS[filters.sort], href: searchHref(filters, { sort: "newest" }) });
  if (urlCar) {
    chips.push({
      label: `🚗 ${carLabel(urlCar, allMakes, allModels)}`,
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

      {chips.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <li key={c.label}>
              <Link
                href={c.href}
                className="flex items-center gap-1.5 rounded-full bg-stone-900 py-1.5 pl-3 pr-2.5 text-sm text-white"
                aria-label={`Fjarlægja síu: ${c.label}`}
              >
                {c.label} <span aria-hidden>✕</span>
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
                <ListingCard listing={l} />
              </li>
            ))}
          </ul>
          {(filters.page > 1 || hasMore) && (
            <nav aria-label="Síður" className="flex gap-2 pt-2">
              {filters.page > 1 && (
                <Link href={pageHref(filters.page - 1)} className="flex-1 rounded-xl border border-stone-300 bg-white py-3 text-center font-medium">
                  ‹ Fyrri
                </Link>
              )}
              {hasMore && (
                <Link href={pageHref(filters.page + 1)} className="flex-1 rounded-xl border border-stone-300 bg-white py-3 text-center font-medium">
                  Næsta ›
                </Link>
              )}
            </nav>
          )}
        </>
      ) : (
        <div className="rounded-2xl bg-white p-6 text-center">
          <p className="font-medium">Ekkert fannst</p>
          <p className="mt-1 text-sm text-stone-500">Prófaðu færri síur eða önnur leitarorð.</p>
          {car && !urlCar && (
            <Link href={searchHref(filters, noCarFilters)} className="mt-3 block font-semibold text-orange-600">
              Leita í öllum bílum
            </Link>
          )}
          <Link href="/oska-eftir" className="mt-3 block font-semibold text-orange-600">
            Skráðu ósk og fáðu tilkynningu →
          </Link>
        </div>
      )}
    </div>
  );
}
