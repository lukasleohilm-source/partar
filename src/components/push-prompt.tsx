"use client";

import { Bell, X } from "lucide-react";
import { useEffect, useState } from "react";
import { enablePush, getPushState } from "@/lib/push-client";
import { reportError } from "@/lib/report-error";

const DISMISSED_KEY = "partar_push_spurt";
const ASK_AGAIN_MS = 14 * 24 * 60 * 60 * 1000;

// Spyr um tilkynningar þegar þær skipta máli (t.d. eftir að maður sendir skilaboð),
// ekki um leið og síðan opnast. Vafrar fela leyfisglugga sem birtast án ástæðu.
export function PushPrompt({ reason }: { reason: string }) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      if (Date.now() - Number(localStorage.getItem(DISMISSED_KEY) ?? 0) < ASK_AGAIN_MS) return;
    } catch {
      return;
    }
    getPushState()
      .then((s) => setShow(s === "off"))
      .catch(() => {});
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {}
    setShow(false);
  }

  async function enable() {
    setBusy(true);
    try {
      const result = await enablePush();
      if (result === "on") {
        setDone(true);
        setTimeout(() => setShow(false), 2500);
      } else {
        dismiss();
      }
    } catch (e) {
      reportError(e, "push: prompt");
      dismiss();
    } finally {
      setBusy(false);
    }
  }

  if (!show) return null;

  return (
    <div className="my-3 flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
      <Bell size={20} className="shrink-0 text-orange-600" />
      {done ? (
        <p className="flex-1 font-medium">Kveikt á tilkynningum ✓</p>
      ) : (
        <>
          <p className="flex-1">{reason}</p>
          <button
            type="button"
            onClick={enable}
            disabled={busy}
            className="shrink-0 rounded-full bg-orange-600 px-3 py-1.5 font-semibold text-white active:scale-95 disabled:opacity-60"
          >
            Kveikja
          </button>
          <button type="button" onClick={dismiss} aria-label="Ekki núna" className="-mr-1 shrink-0 p-1 text-orange-700">
            <X size={18} />
          </button>
        </>
      )}
    </div>
  );
}
