"use client";

import Link from "next/link";
import { useT } from "./lang-provider";

export function LegalLinks() {
  const { t } = useT();
  return (
    <nav aria-label={t("Skilmálar")} className="mt-8 flex justify-center gap-4 text-xs text-stone-500">
      <Link href="/skilmalar" className="underline-offset-2 hover:underline">
        {t("Skilmálar")}
      </Link>
      <Link href="/personuvernd" className="underline-offset-2 hover:underline">
        {t("Persónuvernd")}
      </Link>
    </nav>
  );
}
