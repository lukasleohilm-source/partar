"use client";

import { useEffect, useState } from "react";
import { disablePush, enablePush, getPushState, type PushState } from "@/lib/push-client";

const TEXT: Record<PushState, string> = {
  unsupported: "Þessi vafri styður ekki tilkynningar.",
  "ios-install": "Á iPhone: ýttu á Deila → „Setja á heimaskjá“ og opnaðu Partar þaðan til að fá tilkynningar.",
  denied: "Tilkynningar eru bannaðar í stillingum vafrans. Leyfðu þær þar fyrir partar.lukels255.com.",
  off: "Fáðu tilkynningu í símann þegar þú færð skilaboð eða auglýsing passar við ósk.",
  on: "Kveikt. Þú færð tilkynningu um ný skilaboð og auglýsingar sem passa við óskir.",
};

export function PushToggle({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    getPushState().then(setState).catch(() => setState("unsupported"));
  }, []);

  if (!state || (compact && (state === "on" || state === "unsupported"))) return null;

  async function toggle() {
    setBusy(true);
    setError(false);
    try {
      setState(state === "on" ? await disablePush() : await enablePush());
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  const canToggle = state === "on" || state === "off";

  return (
    <section className="rounded-2xl bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">🔔 Tilkynningar í síma</p>
          <p className="mt-0.5 text-sm text-stone-600">{TEXT[state]}</p>
        </div>
        {canToggle && (
          <button
            type="button"
            role="switch"
            aria-checked={state === "on"}
            aria-label="Tilkynningar í síma"
            disabled={busy}
            onClick={toggle}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
              state === "on" ? "bg-orange-600" : "bg-stone-300"
            }`}
          >
            <span
              className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-all ${state === "on" ? "left-[1.375rem]" : "left-0.5"}`}
            />
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          Ekki tókst að breyta tilkynningum. Reyndu aftur.
        </p>
      )}
    </section>
  );
}
