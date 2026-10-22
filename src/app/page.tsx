import Link from "next/link";
import { cookies } from "next/headers";
import { ListingCard } from "@/components/listing/listing-card";
import { MyCarPicker } from "@/components/search/my-car-picker";
import { KINDS, type Kind } from "@/lib/i18n";
import { LISTING_SUMMARY_SELECT, type ListingSummary } from "@/lib/listings";
import { MY_CAR_COOKIE, parseMyCar } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";

export default async function Home({ searchParams }: { searchParams: Promise<{ villa?: string }> }) {
  const { villa } = await searchParams;
  const myCar = parseMyCar((await cookies()).get(MY_CAR_COOKIE)?.value);
  const supabase = await createClient();
  const [{ data }, makes, models] = await Promise.all([
    supabase
      .from("listings")
      .select(LISTING_SUMMARY_SELECT)
      .eq("status", "active")
      .order("published_at", { ascending: false })
      .order("sort", { referencedTable: "listing_images" })
      .limit(1, { referencedTable: "listing_images" })
      .limit(20),
    supabase.from("makes").select("id, name").order("name"),
    supabase.from("models").select("id, make_id, name").order("name"),
  ]);
  const listings = (data ?? []) as ListingSummary[];

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">
          Partar<span className="text-orange-600">.</span>
        </h1>
      </header>

      {villa === "tenging" && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          Ekki tókst að tengjast þjóninum. Athugaðu nettenginguna og reyndu aftur.
        </p>
      )}

      <form action="/leit" className="space-y-3">
        <input
          type="search"
          name="q"
          placeholder="Hvað vantar þig? t.d. framljós"
          className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
        />
        <div className="relative">
          <input
            disabled
            aria-label="Leit eftir bílnúmeri (kemur bráðum)"
            placeholder="Leit eftir bílnúmeri"
            className="w-full rounded-xl border border-dashed border-stone-300 bg-stone-100 px-4 py-3 text-base text-stone-400"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-stone-200 px-2 py-0.5 text-xs text-stone-500">
            Kemur bráðum
          </span>
        </div>
        <button type="submit" className="w-full rounded-xl bg-orange-600 py-3 font-semibold text-white active:bg-orange-700">
          Leita
        </button>
      </form>

      <div className="mt-4">
        <MyCarPicker key={JSON.stringify(myCar)} makes={makes.data ?? []} models={models.data ?? []} car={myCar} />
        {myCar && (
          <Link href="/leit" className="mt-2 block text-center text-sm font-medium text-orange-700">
            Sjá alla hluti sem passa →
          </Link>
        )}
      </div>

      <nav aria-label="Flýtileiðir" className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {(Object.keys(KINDS) as Kind[]).map((k) => (
          <Link
            key={k}
            href={`/leit?tegund=${k}`}
            className="shrink-0 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium"
          >
            {k === "part" ? "Varahlutir" : k === "parts_car" ? "Partabílar" : "Ódýrir bílar"}
          </Link>
        ))}
      </nav>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Nýjustu auglýsingar</h2>
        {listings.length ? (
          <ul className="grid grid-cols-2 gap-3">
            {listings.map((l) => (
              <li key={l.id}>
                <ListingCard listing={l} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl bg-white p-6 text-center">
            <p className="text-stone-600">Engar auglýsingar enn.</p>
            <Link href="/ny-auglysing" className="mt-3 inline-block font-semibold text-orange-600">
              Vertu fyrst(ur) að selja →
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
