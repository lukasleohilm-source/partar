"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export const RECENT_KEY = "partar_nylega";
const VIEWED_KEY = "partar_skodad";
const MAX_RECENT = 12;
const DAY = 24 * 60 * 60 * 1000;

function read<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "") as T;
  } catch {
    return fallback;
  }
}

// Bætir auglýsingunni efst í „Nýlega skoðað“ og telur skoðun (einu sinni á sólarhring í hverjum vafra)
export function ViewTracker({ listingId, isOwner }: { listingId: string; isOwner: boolean }) {
  useEffect(() => {
    try {
      const recent = read<string[]>(RECENT_KEY, []).filter((id) => id !== listingId);
      localStorage.setItem(RECENT_KEY, JSON.stringify([listingId, ...recent].slice(0, MAX_RECENT)));
    } catch {}
    if (isOwner) return;

    const viewed = read<Record<string, number>>(VIEWED_KEY, {});
    const now = Date.now();
    if (now - (viewed[listingId] ?? 0) < DAY) return;
    // Gamlar færslur hreinsaðar svo geymslan stækki ekki endalaust
    const fresh = Object.fromEntries(Object.entries(viewed).filter(([, t]) => now - t < DAY));
    try {
      localStorage.setItem(VIEWED_KEY, JSON.stringify({ ...fresh, [listingId]: now }));
    } catch {}
    void createClient().rpc("record_view", { p_listing: listingId });
  }, [listingId, isOwner]);

  return null;
}
