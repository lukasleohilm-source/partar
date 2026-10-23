"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { reportError } from "@/lib/report-error";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error, error.digest ? `digest ${error.digest}` : undefined);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 pt-24 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
        <TriangleAlert size={32} />
      </div>
      <h1 className="text-xl font-extrabold">Eitthvað fór úrskeiðis</h1>
      <p className="mt-2 text-stone-600">Villan hefur verið skráð. Reyndu aftur eftir smá stund.</p>
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white active:bg-orange-700"
        >
          <RotateCcw size={18} /> Reyna aftur
        </button>
        <Link href="/" className="rounded-xl border border-stone-300 bg-surface px-5 py-3 font-medium">
          Forsíða
        </Link>
      </div>
    </div>
  );
}
