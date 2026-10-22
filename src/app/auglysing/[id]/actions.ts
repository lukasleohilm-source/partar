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
  revalidatePath("/");
}
