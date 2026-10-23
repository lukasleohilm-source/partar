"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { inputClass, labelClass, primaryButton } from "@/components/ui/styles";
import { REPORT_REASONS, type ReportReason } from "@/lib/moderation";
import { reportListing } from "./actions";

export function ReportListing({ listingId }: { listingId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [result, setResult] = useState<"sent" | "error" | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!reason) return;
    startTransition(async () => {
      const res = await reportListing(listingId, reason, details);
      if (res.needsGuest) return router.push(`/byrja?next=${encodeURIComponent(pathname)}`);
      setResult(res.error ? "error" : "sent");
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-sm text-stone-500 underline-offset-2 hover:underline">
        🚩 Tilkynna auglýsingu
      </button>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Tilkynna auglýsingu"
        footer={
          result === "sent" ? (
            <button type="button" onClick={() => setOpen(false)} className={primaryButton}>
              Loka
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={!reason || pending} className={primaryButton}>
              {pending ? "Sendi…" : "Senda tilkynningu"}
            </button>
          )
        }
      >
        {result === "sent" ? (
          <p className="py-6 text-center">Takk fyrir. Við skoðum auglýsinguna.</p>
        ) : (
          <div className="space-y-4">
            <fieldset className="space-y-2">
              <legend className={labelClass}>Hvað er að?</legend>
              {(Object.keys(REPORT_REASONS) as ReportReason[]).map((r) => (
                <label key={r} className="flex items-center gap-3 rounded-xl bg-white p-3">
                  <input
                    type="radio"
                    name="reason"
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="size-5 accent-orange-600"
                  />
                  {REPORT_REASONS[r]}
                </label>
              ))}
            </fieldset>
            <label className="block">
              <span className={labelClass}>Nánar (valfrjálst)</span>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
                rows={3}
                className={inputClass}
              />
            </label>
            {result === "error" && (
              <p role="alert" className="text-sm text-red-600">
                Ekki tókst að senda. Kannski hefurðu þegar tilkynnt þessa auglýsingu.
              </p>
            )}
          </div>
        )}
      </BottomSheet>
    </>
  );
}
