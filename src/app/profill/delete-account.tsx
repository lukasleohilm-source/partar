"use client";

import { useState, useTransition } from "react";
import { deleteAccount } from "./actions";

export function DeleteAccount() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="mt-10 rounded-2xl border border-red-200 bg-white p-4">
      <h2 className="font-semibold text-red-700">Eyða aðgangi</h2>
      <p className="mt-1 text-sm text-stone-600">
        Allar auglýsingar, myndir, skilaboð og óskir þínar verða fjarlægðar. Þetta er ekki hægt að afturkalla.
      </p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Ertu viss? Öllum gögnum þínum verður eytt varanlega.")) return;
          startTransition(async () => {
            const res = await deleteAccount();
            if (res?.error) setError(res.error);
          });
        }}
        className="mt-3 w-full rounded-xl border border-red-300 py-3 font-medium text-red-700 active:bg-red-50 disabled:opacity-60"
      >
        {pending ? "Eyði aðgangi…" : "Eyða aðgangi og öllum gögnum"}
      </button>
    </section>
  );
}
