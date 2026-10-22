"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Endurnýjar samtalalistann þegar nýtt skilaboð berst í eitthvert samtal
export function LiveRefresh({ userId }: { userId: string }) {
  const router = useRouter();
  const [supabase] = useState(createClient);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) supabase.realtime.setAuth(session.access_token);
      channel = supabase
        .channel(`samtalalisti:${userId}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversations" }, () => router.refresh())
        .subscribe();
    });
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase, userId, router]);

  return null;
}
