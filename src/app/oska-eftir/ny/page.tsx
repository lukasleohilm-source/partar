import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MY_CAR_COOKIE, parseFilters, parseMyCar } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import { WantedForm } from "./wanted-form";
import { getT } from "@/lib/lang-server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: `${t("Ný ósk")} – Partar` };
}

export default async function NewWantedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) redirect("/innskraning?next=%2Foska-eftir%2Fny&krafa=1");

  // Forfyllt úr leit (sömu slóðarbreytur og /leit) eða „Minn bíll“
  const prefill = parseFilters(await searchParams);
  const myCar = parseMyCar((await cookies()).get(MY_CAR_COOKIE)?.value);
  const car = prefill.make
    ? { make: prefill.make, model: prefill.model ?? null, year: prefill.year ?? null }
    : prefill.allCars
      ? null
      : myCar;

  const [makes, models, categories] = await Promise.all([
    supabase.from("makes").select("id, name").order("name"),
    supabase.from("models").select("id, make_id, name").order("name"),
    supabase.from("categories").select("id, parent_id, name, sort").order("sort"),
  ]);

  return (
    <WantedForm
      userId={user.id}
      makes={makes.data ?? []}
      models={models.data ?? []}
      categories={categories.data ?? []}
      initial={{
        query: prefill.q ?? "",
        kind: prefill.kind ?? null,
        category: prefill.category ?? null,
        car,
        maxPrice: prefill.maxPrice ?? null,
        region: prefill.region ?? null,
      }}
    />
  );
}
