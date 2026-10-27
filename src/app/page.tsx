import { Car, CarFront, ChevronRight, Heart, Wrench } from "lucide-react";
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
import { WheelHero } from "@/components/wheel/wheel-hero";
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
      .limit(30),
    supabase.from("makes").select("id, name").order("name"),
    supabase.from("models").select("id, make_id, name").order("name"),
    supabase.from("categories").select("id, slug, sort").is("parent_id", null).order("sort"),
    favoriteIds(supabase, user?.id),
  ]);
  const listings = (data ?? []) as ListingSummary[];

  return (
    <div>
      {/* Forsíðuhaus: texti og leit vinstra megin, þrívíddarfelga hægra megin (tölva) */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-md px-4 pb-6 pt-5 md:grid md:max-w-page md:grid-cols-12 md:items-center md:gap-8 md:px-8 md:pb-16 md:pt-14 lg:min-h-[560px]">
          <header className="mb-6 flex items-center justify-between md:hidden">
            <Logo />
            <div className="flex items-center gap-2">
              <LangSwitch />
              <Link
                href="/uppahalds"
                aria-label={t("Uppáhalds")}
                className="flex size-10 items-center justify-center rounded-full border border-line bg-surface text-stone-700"
              >
                <Heart size={19} strokeWidth={1.75} />
              </Link>
            </div>
          </header>

          <div className="md:col-span-7 lg:col-span-6">
            <h1 className="text-balance text-[34px] font-semibold leading-[1.05] tracking-[-0.035em] text-stone-900 md:text-[56px] lg:text-[64px]">
              {t("Notaðir varahlutir,")} {t("beint frá fólki.")}
            </h1>
            <p className="mt-4 max-w-[34rem] text-[17px] leading-relaxed text-stone-500 md:mt-6 md:text-lg">
              {t("Varahlutir, partabílar og ódýrir bílar um allt land. Finndu það sem passar í bílinn þinn eða seldu það sem þú þarft ekki.")}
            </p>

            {eytt && (
              <p role="status" className="mt-5 rounded-lg border border-green-700/30 bg-green-50 p-3 text-sm text-green-800">
                {t("Aðganginum þínum og öllum gögnum hefur verið eytt.")}
              </p>
            )}
            {villa === "tenging" && (
              <p role="alert" className="mt-5 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                {t("Ekki tókst að tengjast þjóninum. Athugaðu nettenginguna og reyndu aftur.")}
              </p>
            )}

            <div className="mt-6 max-w-xl space-y-3 md:mt-9">
              <SearchBox />
              <MyCarPicker key={JSON.stringify(myCar)} makes={makes.data ?? []} models={models.data ?? []} car={myCar} />
              {myCar && (
                <Link href="/leit" className="flex items-center gap-1 text-sm font-medium text-orange-700">
                  {t("Sjá alla hluti sem passa")} <ChevronRight size={16} />
                </Link>
              )}
            </div>

            <nav aria-label={t("Tegundir")} className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:mt-6 md:px-0">
              {KIND_LINKS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex shrink-0 items-center gap-2 rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-medium text-stone-700 transition-colors duration-150 hover:border-line-strong hover:text-stone-900 active:scale-[0.97]"
                >
                  <Icon size={16} strokeWidth={1.75} className="text-orange-700" /> {t(label)}
                </Link>
              ))}
            </nav>
          </div>

          <div className="relative hidden aspect-square md:col-span-5 md:block lg:col-span-6 lg:aspect-auto lg:h-[520px]">
            <WheelHero />
          </div>
        </div>

        {/* Kostir Partar: hljóðlát textaröð (tölva) */}
        <div className="hidden border-t border-line md:block">
          <dl className="mx-auto grid max-w-page grid-cols-3 gap-10 px-8 py-8">
            {[
              { title: "Frítt að auglýsa", text: "Engin gjöld og engin þóknun. Myndir og auglýsing á einni mínútu." },
              { title: "Spjallað beint", text: "Talaðu við seljandann í skilaboðum á Partar, án milliliða." },
              { title: "Raunverulegir seljendur", text: "Allir sem auglýsa eru með staðfestan aðgang." },
            ].map(({ title, text }) => (
              <div key={title}>
                <dt className="text-[15px] font-medium text-stone-900">{t(title)}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-stone-500">{t(text)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="mx-auto max-w-md md:max-w-page md:px-4">
      <section className="mt-8 px-4 md:mt-12">
        <h2 className="mb-4 text-xl font-semibold tracking-[-0.01em]">{t("Flokkar")}</h2>
        <ul className="grid grid-cols-4 gap-2 md:flex md:gap-1 md:overflow-x-auto md:[scrollbar-width:none]">
          {(categories.data ?? [])
            .filter((c) => c.slug !== "annad")
            .map((c) => {
              const Icon = CATEGORY_ICONS[c.slug] ?? Wrench;
              return (
                <li key={c.id} className="md:flex-1">
                  <Link
                    href={`/leit?flokkur=${c.id}`}
                    className="group flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-line bg-surface p-1 text-center transition-colors duration-150 hover:bg-surface-2 active:scale-[0.97] md:aspect-auto md:min-w-[88px] md:border-transparent md:bg-transparent md:py-3"
                  >
                    <Icon size={22} strokeWidth={1.75} className="text-orange-700 md:text-stone-500 md:transition-colors md:group-hover:text-orange-700" />
                    <span className="text-[12px] font-medium leading-tight text-stone-600 group-hover:text-stone-900">{t(CATEGORY_SHORT[c.slug] ?? c.slug)}</span>
                  </Link>
                </li>
              );
            })}
        </ul>
      </section>

      <RecentlyViewed />

      <section className="mt-8 px-4 md:mt-12">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold tracking-[-0.01em]">{t("Nýjustu auglýsingar")}</h2>
          <Link href="/leit" className="flex items-center gap-0.5 text-sm font-medium text-stone-500 transition-colors hover:text-stone-900">
            {t("Sjá allt")} <ChevronRight size={15} />
          </Link>
        </div>
        {listings.length ? (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 md:gap-x-6 md:gap-y-8 lg:grid-cols-4 xl:grid-cols-5">
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
          <div className="rounded-xl border border-line bg-surface p-8 text-center">
            <Wrench className="mx-auto mb-2 text-stone-400" size={32} />
            <p className="text-stone-600">{t("Engar auglýsingar enn.")}</p>
            <Link href="/ny-auglysing" className="mt-3 inline-block font-semibold text-orange-600">
              {t("Vertu fyrst(ur) að selja →")}
            </Link>
          </div>
        )}
      </section>

      <div className="md:hidden">
        <LegalLinks />
      </div>
      </div>
    </div>
  );
}
