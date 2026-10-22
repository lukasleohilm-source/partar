"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// RLS tryggir að notandi geti aðeins breytt eigin óskum
export async function setWantedActive(id: string, active: boolean) {
  const supabase = await createClient();
  await supabase.from("wanted_requests").update({ active }).eq("id", id);
  revalidatePath("/oska-eftir");
}

export async function deleteWanted(id: string) {
  const supabase = await createClient();
  await supabase.from("wanted_requests").delete().eq("id", id);
  revalidatePath("/oska-eftir");
}
