import { Car, CarFront, ChevronRight, Heart, Search, Wrench } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { LangSwitch } from "@/components/lang-provider";
import { LegalLinks } from "@/components/legal-links";
import { ListingCard } from "@/components/listing/listing-card";
import { RecentlyViewed } from "@/components/listing/recently-viewed";
import { FavoriteButton } from "@/components/listing/listing-actions";
import { Logo } from "@/components/logo";
import { MyCarPicker } from "@/components/search/my-car-picker";
import { SearchBox } from "@/components/search/search-box";
import { CATEGORY_ICONS, CATEGORY_SHORT } from "@/lib/category-icons";
import { favoriteIds } from "@/lib/favorites";
import { getT } from "@/lib/lang-server";
import { LISTING_SUMMARY_SELECT, type ListingSummary } from "@/lib/listings";
import { MY_CAR_COOKIE, parseMyCar } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";

const KIND_LINKS = [
  { href: "/leit?tegund=part", label: "Varahlutir", icon: Wrench },
  { href: "/leit?tegund=parts_car", label: "Partabílar", icon: Car },
  { href: "/leit?tegund=car", label: "Ódýrir bílar", icon: CarFront },
];

export default async function Home({ searchParams }: { searchParams: Promise<{ villa?: string; eytt?: string }> }) {
  const { villa, eytt } = await searchParams;
  const { t } = await getT();
  const myCar = parseMyCar((await cookies()).get(MY_CAR_COOKIE)?.value);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data }, makes, models, categories, favs] = await Promise.all([
    supabase
      .from("listings")
      .select(LISTING_SUMMARY_SELECT)
      .eq("status", "active")
      .order("published_at", { ascending: false })
      .limit(20),
    supabase.from("makes").select("id, name").order("name"),
    supabase.from("models").select("id, make_id, name").order("name"),
    supabase.from("categories").select("id, slug, sort").is("parent_id", null).order("sort"),
    favoriteIds(supabase, user?.id),
  ]);
  const listings = (data ?? []) as ListingSummary[];

  return (
    <div className="mx-auto max-w-md md:max-w-6xl md:px-2">
      {/* Haus með litaðri bakgrunnsbylgju */}
      <section className="relative overflow-hidden px-4 pb-5 pt-5 md:pb-10 md:pt-14">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 -z-10 h-56 md:h-80 bg-[radial-gradient(120%_100%_at_100%_0%,rgb(251_146_60/0.35),transparent_60%),radial-gradient(90%_80%_at_0%_0%,rgb(234_88_12/0.18),transparent_60%)]"
        />
        <header className="mb-5 flex items-center justify-between md:hidden">
          <Logo />
          <div className="flex items-center gap-2">
          <LangSwitch />
          <Link
            href="/uppahalds"
            aria-label={t("Uppáhalds")}
            className="flex size-10 items-center justify-center rounded-full bg-surface/80 text-stone-700 shadow-sm ring-1 ring-black/5 backdrop-blur"
          >
            <Heart size={20} />
          </Link>
          </div>
        </header>
        <h1 className="mb-4 text-[26px] font-extrabold leading-[1.15] tracking-tight text-stone-900 md:mb-8 md:text-center md:text-5xl">
          {t("Notaðir varahlutir,")}
          <br />
          <span className="text-orange-600">{t("beint frá fólki.")}</span>
        </h1>

        {eytt && (
          <p role="status" className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-800">
            {t("Aðganginum þínum og öllum gögnum hefur verið eytt.")}
          </p>
        )}
        {villa === "tenging" && (
          <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {t("Ekki tókst að tengjast þjóninum. Athugaðu nettenginguna og reyndu aftur.")}
          </p>
        )}

        <div className="md:mx-auto md:max-w-2xl">
          <SearchBox />

          <div className="relative mt-2">
            <input
              disabled
              aria-label={t("Leit eftir bílnúmeri (kemur bráðum)")}
              placeholder={t("Leita eftir bílnúmeri")}
              className="w-full rounded-2xl border border-dashed border-stone-300 bg-transparent py-3 pl-11 pr-4 text-[15px] text-stone-400"
            />
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" aria-hidden />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-medium text-stone-500">
              {t("Kemur bráðum")}
            </span>
          </div>

          <div className="mt-3">
            <MyCarPicker key={JSON.stringify(myCar)} makes={makes.data ?? []} models={models.data ?? []} car={myCar} />
            {myCar && (
              <Link href="/leit" className="mt-2 flex items-center justify-center gap-1 text-sm font-semibold text-orange-700">
                {t("Sjá alla hluti sem passa")} <ChevronRight size={16} />
              </Link>
            )}
          </div>
        </div>
      </section>

      <nav aria-label={t("Tegundir")} className="flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:justify-center">
        {KIND_LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex shrink-0 items-center gap-2 rounded-full bg-surface px-4 py-2.5 text-sm font-semibold shadow-sm ring-1 ring-black/5 active:scale-95"
          >
            <Icon size={17} className="text-orange-600" /> {t(label)}
          </Link>
        ))}
      </nav>

      <section className="mt-6 px-4">
        <h2 className="mb-3 text-lg font-bold tracking-tight">{t("Flokkar")}</h2>
        <ul className="grid grid-cols-4 gap-2 md:grid-cols-6 md:gap-3 lg:grid-cols-12">
          {(categories.data ?? [])
            .filter((c) => c.slug !== "annad")
            .map((c) => {
              const Icon = CATEGORY_ICONS[c.slug] ?? Wrench;
              return (
                <li key={c.id}>
                  <Link
                    href={`/leit?flokkur=${c.id}`}
                    className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl bg-surface p-1 text-center shadow-sm ring-1 ring-black/5 active:scale-95"
                  >
                    <span className="flex size-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                      <Icon size={21} strokeWidth={2.1} />
                    </span>
                    <span className="text-[11px] font-semibold leading-tight text-stone-700">{t(CATEGORY_SHORT[c.slug] ?? c.slug)}</span>
                  </Link>
                </li>
              );
            })}
        </ul>
      </section>

      <RecentlyViewed />

      <section className="mt-7 px-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-bold tracking-tight">{t("Nýjustu auglýsingar")}</h2>
          <Link href="/leit" className="text-sm font-semibold text-orange-600">
            {t("Sjá allt")}
          </Link>
        </div>
        {listings.length ? (
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
            {listings.map((l, i) => (
              <li key={l.id}>
                <ListingCard
                  listing={l}
                  priority={i < 4}
                  favorite={l.seller_id !== user?.id && <FavoriteButton listingId={l.id} initial={favs.has(l.id)} />}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl bg-surface p-8 text-center shadow-sm">
            <Wrench className="mx-auto mb-2 text-stone-400" size={32} />
            <p className="text-stone-600">{t("Engar auglýsingar enn.")}</p>
            <Link href="/ny-auglysing" className="mt-3 inline-block font-semibold text-orange-600">
              {t("Vertu fyrst(ur) að selja →")}
            </Link>
          </div>
        )}
      </section>

      <LegalLinks />
    </div>
  );
}
