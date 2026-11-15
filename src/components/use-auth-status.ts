"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** "loading" meðan lotan er lesin, "user" fyrir skráðan aðgang, "guest" fyrir óinnskráða og nafnlausa gesti */
export type AuthStatus = "loading" | "user" | "guest";

export function useAuthStatus(): AuthStatus {
  const [status, setStatus] = useState<AuthStatus>("loading");
  useEffect(() => {
    const supabase = createClient();
    const read = (user: { is_anonymous?: boolean } | null | undefined) => setStatus(user && !user.is_anonymous ? "user" : "guest");
    supabase.auth.getSession().then(({ data: { session } }) => read(session?.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => read(session?.user));
    return () => sub.subscription.unsubscribe();
  }, []);
  return status;
}
