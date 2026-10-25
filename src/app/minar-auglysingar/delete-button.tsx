"use client";

import { useState, useTransition } from "react";
import { deleteListing } from "@/app/auglysing/[id]/actions";
import { useT } from "@/components/lang-provider";

export function DeleteListingButton({ listingId, title }: { listingId: string; title: string }) {
  const { t } = useT();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(t("Eyða „{titill}“? Þetta er ekki hægt að afturkalla.", { titill: title }))) return;
          startTransition(async () => {
            const res = await deleteListing(listingId);
            setError(res.error ?? null);
          });
        }}
        className="text-red-600 disabled:opacity-50"
      >
        {pending ? t("Eyði…") : t("Eyða")}
      </button>
      {error && (
        <span role="alert" className="w-full text-xs text-red-600">
          {t(error)}
        </span>
      )}
    </>
  );
}
