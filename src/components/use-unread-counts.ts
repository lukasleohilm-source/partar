"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { UNREAD_EVENT } from "@/lib/chat";
import { createClient } from "@/lib/supabase/client";

export type UnreadCounts = { conversations: number; notifications: number };

// Fjöldi ólesinna samtala og tilkynninga; uppfærist í rauntíma
// `scope` aðgreinir rauntímarásir þegar fleiri en ein valmynd notar þetta samtímis
export function useUnreadCounts(scope = "nav"): UnreadCounts {
  const pathname = usePathname();
  const [supabase] = useState(createClient);
  const [counts, setCounts] = useState<UnreadCounts>({ conversations: 0, notifications: 0 });
  const [userId, setUserId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data } = await supabase.rpc("my_unread_counts");
    if (data) setCounts(data as UnreadCounts);
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user.id ?? null);
      if (session) supabase.realtime.setAuth(session.access_token);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUserId(session?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!userId) return;
    refresh();
  }, [userId, pathname, refresh]);

  useEffect(() => {
    if (!userId) return;
    // RLS sér til þess að aðeins eigin samtöl og tilkynningar berist
    const channel = supabase
      .channel(`olesid:${scope}:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, refresh)
      .subscribe();
    window.addEventListener(UNREAD_EVENT, refresh);
    return () => {
      window.removeEventListener(UNREAD_EVENT, refresh);
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, refresh, scope]);

  return userId ? counts : { conversations: 0, notifications: 0 };
}
