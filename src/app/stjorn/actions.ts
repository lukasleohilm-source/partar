"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Öll föll athuga is_admin() í gagnagrunninum; hér er bara kallað á þau

export async function hideListing(listingId: string) {
  const supabase = await createClient();
  await supabase.rpc("admin_set_listing_status", { p_listing: listingId, p_status: "removed", p_clear_reports: false });
  revalidatePath("/stjorn");
}

export async function restoreListing(listingId: string) {
  const supabase = await createClient();
  await supabase.rpc("admin_set_listing_status", { p_listing: listingId, p_status: "active", p_clear_reports: true });
  revalidatePath("/stjorn");
}

export async function dismissReports(listingId: string, status: string) {
  const supabase = await createClient();
  await supabase.rpc("admin_set_listing_status", { p_listing: listingId, p_status: status, p_clear_reports: true });
  revalidatePath("/stjorn");
}

export async function setBan(userId: string, ban: boolean) {
  const supabase = await createClient();
  await supabase.rpc("admin_ban_user", { p_user: userId, p_ban: ban });
  revalidatePath("/stjorn");
}
