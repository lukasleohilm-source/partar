"use client";

import { useState, useTransition } from "react";
import { deleteListing } from "@/app/auglysing/[id]/actions";

export function DeleteListingButton({ listingId, title }: { listingId: string; title: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`Eyða „${title}“? Þetta er ekki hægt að afturkalla.`)) return;
          startTransition(async () => {
            const res = await deleteListing(listingId);
            setError(res.error ?? null);
          });
        }}
        className="text-red-600 disabled:opacity-50"
      >
        {pending ? "Eyði…" : "Eyða"}
      </button>
      {error && (
        <span role="alert" className="w-full text-xs text-red-600">
          {error}
        </span>
      )}
    </>
  );
}
