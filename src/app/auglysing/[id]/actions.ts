"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { storagePaths } from "@/lib/listings";
import { REPORT_REASONS, type ReportReason } from "@/lib/moderation";
import { createClient } from "@/lib/supabase/server";

export async function contactSeller(listingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Gestur fer fyrst í gegnum /byrja (CAPTCHA og nafnlaus notandi) og kemur svo aftur
  if (!user) redirect(`/byrja?next=${encodeURIComponent(`/auglysing/${listingId}`)}`);

  const { data: conversationId, error } = await supabase.rpc("start_conversation", { p_listing: listingId });
  if (error?.message.includes("blocked")) redirect(`/auglysing/${listingId}?villa=lokad`);
  if (error || !conversationId) redirect(`/auglysing/${listingId}?villa=spjall`);

  redirect(`/skilabod/${conversationId}`);
}

export async function reportListing(
  listingId: string,
  reason: ReportReason,
  details: string,
): Promise<{ error?: boolean; needsGuest?: boolean }> {
  if (!(reason in REPORT_REASONS)) return { error: true };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { needsGuest: true };

  const { error } = await supabase.from("reports").insert({
    listing_id: listingId,
    reporter_id: user.id,
    reason,
    details: details.trim().slice(0, 1000) || null,
  });
  return error ? { error: true } : {};
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
    .select("path, thumb_path, listings!inner(seller_id)")
    .eq("listing_id", listingId)
    .eq("listings.seller_id", user.id);
  if (images?.length) {
    await supabase.storage.from("listing-images").remove(storagePaths(images));
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
