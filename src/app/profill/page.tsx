import { Bell, FileText, Heart, LogOut, Languages, Package, Pencil, Search, Shield, ShieldCheck, Star, Trash2, UserRoundPlus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { REGIONS, formatDecimal, isRegion } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";
import { ActionRow, Group, Row } from "./ui";
import { LangSwitch } from "@/components/lang-provider";
import { getT } from "@/lib/lang-server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: `${t("Ég")} – Partar` };
}

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ vistad?: string }> }) {
  const { t, lang } = await getT();
  const { vistad } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const count = { count: "exact" as const, head: true };
  const [{ data: profile }, { data: contact }, { data: isAdmin }, listings, favorites, wants, { data: rating }] = await Promise.all([
    supabase.from("profiles").select("display_name, region").eq("id", user.id).single(),
    supabase.from("profile_contacts").select("phone, show_phone").eq("id", user.id).single(),
    supabase.rpc("is_admin"),
    supabase.from("listings").select("id", count).eq("seller_id", user.id).eq("status", "active"),
    supabase.from("favorites").select("listing_id", count).eq("user_id", user.id),
    supabase.from("wanted_requests").select("id", count).eq("user_id", user.id),
    supabase.rpc("seller_rating", { p_seller: user.id }).single<{ average: number | null; total: number }>(),
  ]);

  const guest = user.is_anonymous || !user.email;
  const name = profile?.display_name || "Notandi";
  const region = profile?.region && isRegion(profile.region) ? t(REGIONS[profile.region]) : null;
  const pending = user.new_email ? t("Bíður staðfestingar: {netfang}", { netfang: user.new_email }) : null;

  return (
    <div className="mx-auto max-w-md md:max-w-2xl md:pt-10 px-4 pt-6">
      <h1 className="sr-only">{t("Ég")}</h1>

      {/* Haus: hver ég er og yfirlit */}
      <section className="mb-5 rounded-3xl bg-surface p-5">
        <div className="flex items-center gap-4">
          <Avatar name={name} size={64} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-bold tracking-tight">{name}</p>
            {region && <p className="text-sm text-stone-600">{region}</p>}
            {guest ? (
              <p className="mt-1 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-600">{t("Gestur")}</span>
                {pending && <span className="truncate text-xs text-stone-500">{pending}</span>}
              </p>
            ) : (
              <p className="truncate text-sm text-stone-500">{user.email}</p>
            )}
          </div>
          <Link
            href="/profill/breyta"
            aria-label={t("Breyta prófíl")}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-stone-100 text-stone-700 active:bg-stone-200"
          >
            <Pencil size={18} />
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-3 divide-x divide-line rounded-2xl bg-canvas py-3 text-center">
          <Link href="/minar-auglysingar" className="block">
            <span className="block text-lg font-bold tabular-nums">{listings.count ?? 0}</span>
            <span className="block text-xs text-stone-500">{t("Virkar auglýsingar")}</span>
          </Link>
          <Link href="/uppahalds" className="block">
            <span className="block text-lg font-bold tabular-nums">{favorites.count ?? 0}</span>
            <span className="block text-xs text-stone-500">{t("Uppáhalds")}</span>
          </Link>
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
            <span className="block text-xs text-stone-500">{rating?.total ? t("{n} einkunnir", { n: rating.total }) : t("Engin einkunn")}</span>
          </div>
        </div>
      </section>

      {vistad && !guest && (
        <p role="status" className="mb-5 rounded-2xl bg-green-50 p-3 text-sm text-green-800">
          {t("Aðgangurinn er vistaður. Þú getur nú skráð þig inn með honum á hvaða tæki sem er.")}
        </p>
      )}

      {guest && (
        <Link href="/profill/vista" className="mb-5 flex items-center gap-3 rounded-2xl bg-orange-600 p-4 text-white active:bg-orange-700">
          <UserRoundPlus size={24} className="shrink-0" />
          <span className="flex-1">
            <span className="block font-semibold">{t("Vistaðu aðganginn")}</span>
            <span className="block text-sm text-orange-100">{t("Annars tapast auglýsingar og skilaboð ef þú skiptir um síma.")}</span>
          </span>
        </Link>
      )}

      <Group title={t("Mitt á Partar")}>
        <Row href="/minar-auglysingar" icon={Package} tone="orange" label={t("Mínar auglýsingar")} value={listings.count ?? 0} />
        <Row href="/uppahalds" icon={Heart} tone="red" label={t("Uppáhalds")} value={favorites.count ?? 0} />
        <Row href="/oska-eftir" icon={Search} tone="violet" label={t("Óskir")} hint={t("Láttu vita þegar hluturinn kemur")} value={wants.count ?? 0} />
      </Group>

      <Group title={t("Stillingar")}>
        {/* Tungumál beint í röðinni, án undirsíðu */}
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-600">
            <Languages size={19} />
          </span>
          <span className="flex-1 font-medium text-stone-900">{t("Tungumál")}</span>
          <LangSwitch />
        </div>
        <Row
          href="/profill/breyta"
          icon={Pencil}
          tone="blue"
          label={t("Prófíll og sími")}
          hint={contact?.phone ? (contact.show_phone ? t("Sími sýnilegur á auglýsingum") : t("Sími falinn")) : t("Nafn, landshluti og símanúmer")}
        />
        <Row
          href="/profill/tilkynningar"
          icon={Bell}
          tone="green"
          label={t("Tilkynningar")}
          hint={guest ? t("Vistaðu aðganginn til að fá tölvupóst") : t("Í tölvupósti")}
        />
        {isAdmin && <Row href="/stjorn" icon={Shield} tone="dark" label={t("Stjórnborð")} />}
      </Group>

      <Group title={t("Annað")}>
        <Row href="/skilmalar" icon={FileText} label={t("Skilmálar")} />
        <Row href="/personuvernd" icon={ShieldCheck} label={t("Persónuvernd")} />
      </Group>

      <Group>
        {/* Gestur myndi tapa öllu við útskráningu, svo hann fær ekki þann hnapp */}
        {!guest && <ActionRow action={logout} icon={LogOut} label={t("Skrá út")} />}
        <Row href="/profill/eyda" icon={Trash2} label={t("Eyða aðgangi")} danger />
      </Group>

      <p className="pb-4 text-center text-xs text-stone-400">{t("Partar · notaðir varahlutir og bílar")}</p>
    </div>
  );
}
