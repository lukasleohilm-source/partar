"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isRegion } from "@/lib/i18n";
import { storagePaths } from "@/lib/listings";

export type ProfileState = { status: "idle" | "saved" | "error"; message?: string };

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const displayName = String(formData.get("display_name") ?? "").trim();
  const regionRaw = String(formData.get("region") ?? "");
  const phone = String(formData.get("phone") ?? "").replace(/[^\d+ ]/g, "").trim();
  const showPhone = formData.get("show_phone") === "on";

  if (displayName.length < 1 || displayName.length > 60) {
    return { status: "error", message: "Nafn þarf að vera 1–60 stafir." };
  }

  const { error: e1 } = await supabase
    .from("profiles")
    .update({ display_name: displayName, region: isRegion(regionRaw) ? regionRaw : null })
    .eq("id", user.id);

  const { error: e2 } = await supabase
    .from("profile_contacts")
    .update({ phone: phone || null, show_phone: Boolean(phone) && showPhone })
    .eq("id", user.id);

  if (e1 || e2) return { status: "error", message: "Ekki tókst að vista. Reyndu aftur." };

  revalidatePath("/profill");
  return { status: "saved" };
}

export async function deleteAccount(): Promise<{ error?: string } | void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // Myndaskrár fyrst; gagnagrunnurinn sér um rest með cascade
  const { data: images } = await supabase
    .from("listing_images")
    .select("path, thumb_path, listings!inner(seller_id)")
    .eq("listings.seller_id", user.id);
  if (images?.length) {
    const { error } = await supabase.storage.from("listing-images").remove(storagePaths(images));
    if (error) return { error: "Ekki tókst að eyða myndum. Reyndu aftur." };
  }

  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { error: "Ekki tókst að eyða aðganginum. Reyndu aftur." };

  await supabase.auth.signOut();
  redirect("/?eytt=1");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
