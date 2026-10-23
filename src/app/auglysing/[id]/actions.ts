"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function contactSeller(listingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Innskráning er ekki komin: gestur fær nafnlausan notanda
  if (!user) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw new Error("Ekki tókst að hefja spjall.");
  }

  const { data: conversationId, error } = await supabase.rpc("start_conversation", { p_listing: listingId });
  if (error || !conversationId) throw new Error("Ekki tókst að hefja spjall.");

  redirect(`/skilabod/${conversationId}`);
}

export async function setListingStatus(listingId: string, status: "active" | "sold") {
  const supabase = await createClient();
  // RLS tryggir að aðeins seljandinn geti breytt
  await supabase.from("listings").update({ status }).eq("id", listingId);
  revalidatePath(`/auglysing/${listingId}`);
  revalidatePath("/minar-auglysingar");
  revalidatePath("/");
}

export async function deleteListing(listingId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Ekki innskráð(ur)." };

  // Myndaskrár fyrst; línurnar í listing_images, fitments og samtöl fara með auglýsingunni (cascade)
  const { data: images } = await supabase
    .from("listing_images")
    .select("path, listings!inner(seller_id)")
    .eq("listing_id", listingId)
    .eq("listings.seller_id", user.id);
  if (images?.length) {
    await supabase.storage.from("listing-images").remove(images.map((i) => i.path));
  }

  const { error, count } = await supabase
    .from("listings")
    .delete({ count: "exact" })
    .eq("id", listingId)
    .eq("seller_id", user.id);
  if (error || !count) return { error: "Ekki tókst að eyða auglýsingunni." };

  revalidatePath("/minar-auglysingar");
  revalidatePath("/");
  return {};
}
