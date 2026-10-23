import type { SupabaseClient } from "@supabase/supabase-js";

// Auðkenni auglýsinga sem notandinn hefur sett í uppáhalds (tómt fyrir gesti)
export async function favoriteIds(supabase: SupabaseClient, userId: string | undefined): Promise<Set<string>> {
  if (!userId) return new Set();
  const { data } = await supabase.from("favorites").select("listing_id").eq("user_id", userId);
  return new Set((data ?? []).map((r) => r.listing_id as string));
}
