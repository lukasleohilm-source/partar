"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  channel: string;
  table: "conversations" | "notifications";
  event?: "INSERT" | "UPDATE" | "*";
  filter?: string;
};

// Endurhleður gögn síðunnar (Server Component) þegar breyting verður á töflu.
// RLS sér til þess að aðeins eigin línur berist.
export function LiveRefresh({ channel, table, event = "*", filter }: Props) {
  const router = useRouter();
  const [supabase] = useState(createClient);

  useEffect(() => {
    let ch: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) supabase.realtime.setAuth(session.access_token);
      ch = supabase
        .channel(channel)
        .on("postgres_changes", { event, schema: "public", table, filter }, () => router.refresh())
        .subscribe();
    });
    return () => {
      cancelled = true;
      if (ch) supabase.removeChannel(ch);
    };
  }, [supabase, channel, table, event, filter, router]);

  return null;
}
