"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setBlocked(conversationId: string, otherId: string, blocked: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // RLS: aðeins eigin lokanir
  if (blocked) {
    await supabase.from("blocks").upsert({ blocker_id: user.id, blocked_id: otherId });
  } else {
    await supabase.from("blocks").delete().eq("blocker_id", user.id).eq("blocked_id", otherId);
  }
  revalidatePath(`/skilabod/${conversationId}`);
}
