"use client";

import { Bell, Share, SquarePlus } from "lucide-react";
import { useEffect, useState } from "react";
import { disablePush, enablePush, getPushState, isIos, type PushState } from "@/lib/push-client";
import { reportError } from "@/lib/report-error";

const TEXT: Record<PushState, string> = {
  unsupported: "Þessi vafri styður ekki tilkynningar. Prófaðu Chrome á Android eða Safari á iPhone.",
  "in-app":
    "Þú ert í vafra inni í Facebook eða öðru appi og hann styður ekki tilkynningar. Ýttu á ⋯ og veldu „Opna í vafra“ (Chrome eða Safari).",
  "ios-install": "Á iPhone virka tilkynningar aðeins ef Partar er sett á heimaskjáinn:",
  "ios-old": "Tilkynningar á iPhone þurfa iOS 16.4 eða nýrra. Uppfærðu símann í Stillingar → Almennt → Hugbúnaðaruppfærsla.",
  denied: "",
  off: "Fáðu tilkynningu í símann þegar þú færð skilaboð eða auglýsing passar við ósk.",
  on: "Kveikt. Þú færð tilkynningu um ný skilaboð og auglýsingar sem passa við óskir.",
};

function deniedText(): string {
  return isIos()
    ? "Tilkynningar eru bannaðar. Opnaðu Stillingar → Tilkynningar → Partar og kveiktu á „Leyfa tilkynningar“."
    : "Tilkynningar eru bannaðar fyrir þessa síðu. Ýttu á lásinn eða ⓘ vinstra megin við slóðina efst → Heimildir → Tilkynningar → Leyfa. Endurhlaða svo síðunni.";
}

function errorText(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.startsWith("save:")) return "Ekki tókst að vista áskriftina. Prófaðu að endurhlaða síðunni og reyna aftur.";
  if (msg.startsWith("timeout")) return "Síminn svaraði ekki í tæka tíð. Athugaðu nettenginguna og reyndu aftur.";
  return "Ekki tókst að kveikja á tilkynningum. Reyndu aftur.";
}

export function PushToggle({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    getPushState()
      .then(setState)
      .catch((e) => {
        reportError(e, "push: getPushState");
        setState("unsupported");
      });
  }, []);

  if (!state || (compact && (state === "on" || state === "unsupported"))) return null;

  async function toggle() {
    setBusy(true);
    setNotice(null);
    try {
      if (state === "on") {
        setState(await disablePush());
        return;
      }
      const result = await enablePush();
      if (result === "dismissed") {
        setNotice("Þú lokaðir glugganum án þess að leyfa. Ýttu aftur og veldu „Leyfa“.");
        return;
      }
      setState(result);
      if (result === "on") {
        // Staðfesting beint í símann svo notandinn sjái strax að þetta virkar
        const reg = await navigator.serviceWorker.ready;
        await reg
          .showNotification("Tilkynningar virka 🎉", { body: "Þú færð tilkynningu þegar eitthvað gerist á Partar.", icon: "/pwa-icon/192" })
          .catch(() => {});
      }
    } catch (e) {
      reportError(e, `push: toggle from ${state}`);
      setNotice(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const canToggle = state === "on" || state === "off";

  return (
    <section className="rounded-2xl bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-semibold">
            <Bell size={18} className="text-orange-600" /> Tilkynningar í síma
          </p>
          <p className="mt-0.5 text-sm text-stone-600">{state === "denied" ? deniedText() : TEXT[state]}</p>
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
      {state === "ios-install" && (
        <ol className="mt-3 space-y-2 text-sm text-stone-700">
          <li className="flex items-center gap-2">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">1</span>
            Ýttu á <Share size={16} className="text-blue-600" aria-label="Deila" /> Deila neðst í Safari
          </li>
          <li className="flex items-center gap-2">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">2</span>
            Veldu <SquarePlus size={16} aria-hidden /> „Setja á heimaskjá“ (Add to Home Screen)
          </li>
          <li className="flex items-center gap-2">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">3</span>
            Opnaðu Partar af heimaskjánum, skráðu þig inn og kveiktu hér
          </li>
        </ol>
      )}
      {notice && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {notice}
        </p>
      )}
    </section>
  );
}
