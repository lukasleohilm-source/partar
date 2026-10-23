"use client";

import { createClient } from "@/lib/supabase/client";

const seen = new Set<string>();
let sent = 0;

// Skráir villu úr vafra í client_errors (sést á /stjorn). Hámark 5 á hverja síðuhleðslu, engin tvítekning.
export function reportError(error: unknown, extra?: string) {
  try {
    const e = error instanceof Error ? error : new Error(String(error));
    const message = `${e.name}: ${e.message}${extra ? ` (${extra})` : ""}`.slice(0, 1000);
    if (seen.has(message) || sent >= 5) return;
    seen.add(message);
    sent++;
    void createClient()
      .from("client_errors")
      .insert({
        message,
        stack: e.stack?.slice(0, 4000) ?? null,
        url: location.pathname.slice(0, 500),
        user_agent: navigator.userAgent.slice(0, 300),
      })
      .then(() => {});
  } catch {
    // Villuskráning má aldrei valda annarri villu
  }
}
