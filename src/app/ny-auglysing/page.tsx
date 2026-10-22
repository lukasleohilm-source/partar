import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ListingForm } from "./listing-form";

export const metadata = { title: "Ný auglýsing – Partar" };

export default async function NewListingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [makes, models, categories, profile] = await Promise.all([
    supabase.from("makes").select("id, name").order("name"),
    supabase.from("models").select("id, make_id, name").order("name"),
    supabase.from("categories").select("id, parent_id, name, sort").order("sort"),
    supabase.from("profiles").select("region").eq("id", user.id).single(),
  ]);

  return (
    <ListingForm
      userId={user.id}
      makes={makes.data ?? []}
      models={models.data ?? []}
      categories={categories.data ?? []}
      defaultRegion={profile.data?.region ?? null}
    />
  );
}
