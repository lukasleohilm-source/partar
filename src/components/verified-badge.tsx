"use client";

import { ShieldCheck } from "lucide-react";
import { useT } from "@/components/lang-provider";

// „Staðfestur seljandi“: seljandinn hefur auðkennt sig með rafrænum skilríkjum
export function VerifiedBadge({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const { t } = useT();
  const label = t("Staðfestur seljandi");
  if (compact) {
    return (
      <ShieldCheck
        size={15}
        strokeWidth={2.4}
        className={`inline shrink-0 text-emerald-600 dark:text-emerald-400 ${className}`}
        aria-label={label}
        role="img"
      >
        <title>{label}</title>
      </ShieldCheck>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 ${className}`}
      title={t("Hefur auðkennt sig með rafrænum skilríkjum")}
    >
      <ShieldCheck size={13} strokeWidth={2.4} /> {label}
    </span>
  );
}
