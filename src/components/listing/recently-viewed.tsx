"use client";

import { History, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ListingCard } from "@/components/listing/listing-card";
import { RECENT_KEY } from "@/components/listing/view-tracker";
import { LISTING_SUMMARY_SELECT, type ListingSummary } from "@/lib/listings";
import { createClient } from "@/lib/supabase/client";

// „Nýlega skoðað“ á forsíðu. Listinn er geymdur í vafranum (sjá ViewTracker).
export function RecentlyViewed() {
  const [items, setItems] = useState<ListingSummary[]>([]);

  useEffect(() => {
    let ids: string[] = [];
    try {
      ids = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    } catch {}
    if (!ids.length) return;
    createClient()
      .from("listings")
      .select(LISTING_SUMMARY_SELECT)
      .in("id", ids)
      .in("status", ["active", "sold"])
      .then(({ data }) => {
        const rows = (data ?? []) as ListingSummary[];
        // Sama röð og skoðað var, nýjast fyrst
        setItems(ids.flatMap((id) => rows.filter((r) => r.id === id)).map((r) => ({ ...r, listing_images: [...r.listing_images].sort((a, b) => a.sort - b.sort) })));
      });
  }, []);

  function clear() {
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {}
    setItems([]);
  }

  if (!items.length) return null;

  return (
    <section className="mt-7 px-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <History size={19} className="text-orange-600" /> Nýlega skoðað
        </h2>
        <button type="button" onClick={clear} className="flex items-center gap-1 text-sm font-medium text-stone-500">
          <X size={15} /> Hreinsa
        </button>
      </div>
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:px-0">
        {items.map((l) => (
          <li key={l.id} className="w-40 shrink-0 snap-start md:w-52">
            <ListingCard listing={l} />
          </li>
        ))}
      </ul>
    </section>
  );
}
