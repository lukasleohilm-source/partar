import { notFound, redirect } from "next/navigation";
import { ListingForm, type ExistingListing } from "@/app/ny-auglysing/listing-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Breyta auglýsingu – Partar" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Row = Omit<ExistingListing, "images" | "fitments"> & {
  seller_id: string;
  listing_images: (ExistingListing["images"][number] & { sort: number })[];
  listing_fitments: ExistingListing["fitments"];
};

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/?villa=tenging");

  const [{ data: listing }, makes, models, categories] = await Promise.all([
    supabase
      .from("listings")
      .select(
        `id, seller_id, kind, title, description, category_id, price_isk, condition, region, postal_code,
         part_number, mileage_km, license_plate, universal_fit,
         listing_images(path, thumb_path, color, width, height, sort),
         listing_fitments(make_id, model_id, year_from, year_to)`,
      )
      .eq("id", id)
      .maybeSingle<Row>(),
    supabase.from("makes").select("id, name").order("name"),
    supabase.from("models").select("id, make_id, name").order("name"),
    supabase.from("categories").select("id, parent_id, name, sort").order("sort"),
  ]);

  // Aðeins seljandinn má breyta
  if (!listing || listing.seller_id !== user.id) notFound();

  const { listing_images, listing_fitments, ...rest } = listing;

  return (
    <ListingForm
      userId={user.id}
      makes={makes.data ?? []}
      models={models.data ?? []}
      categories={categories.data ?? []}
      defaultRegion={listing.region}
      existing={{
        ...rest,
        images: [...listing_images].sort((a, b) => a.sort - b.sort),
        fitments: listing_fitments,
      }}
    />
  );
}
