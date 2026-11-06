"use client";

import { ChevronRight, EllipsisVertical, Share, Smartphone, SquarePlus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useT } from "@/components/lang-provider";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { INSTALL_EVENT, getInstallMode, installedBefore, promptInstall, type InstallMode } from "@/lib/install-client";
import { reportError } from "@/lib/report-error";

// Fylgist með hvort hægt sé að setja upp (atburðurinn getur komið eftir að síðan birtist)
function useInstall() {
  const [mode, setMode] = useState<InstallMode | null>(null);
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    const update = () => setMode(getInstallMode());
    update();
    window.addEventListener(INSTALL_EVENT, update);
    return () => window.removeEventListener(INSTALL_EVENT, update);
  }, []);

  // Eitt smell þar sem vafrinn leyfir það, annars leiðarvísir
  const install = useCallback(async () => {
    if (getInstallMode() !== "prompt") return setSheet(true);
    try {
      await promptInstall();
    } catch (e) {
      reportError(e, "install: prompt");
      setSheet(true);
    }
  }, []);

  return { mode, install, sheet, closeSheet: () => setSheet(false) };
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-orange-100 text-sm font-bold text-orange-700">{n}</span>
      <span className="flex flex-wrap items-center gap-1.5">{children}</span>
    </li>
  );
}

function InstallSheet({ open, onClose, mode }: { open: boolean; onClose: () => void; mode: InstallMode | null }) {
  const { t } = useT();
  return (
    <BottomSheet open={open} onClose={onClose} title={t("Sækja Partar appið")}>
      <div className="pb-[env(safe-area-inset-bottom)] text-[15px] text-stone-700">
        <p className="mb-4 text-stone-600">
          {t("Partar fer á heimaskjáinn eins og venjulegt app: opnast í eigin glugga og sendir tilkynningar í símann. Ekkert App Store, ekkert niðurhal.")}
        </p>
        {mode === "in-app" ? (
          <p className="rounded-xl bg-surface p-3">
            {t("Þú ert í vafra inni í Facebook eða öðru appi. Ýttu á ⋯ og veldu „Opna í vafra“ (Chrome eða Safari) og reyndu aftur.")}
          </p>
        ) : mode === "ios" ? (
          <ol className="space-y-3">
            <Step n={1}>
              {t("Ýttu á")} <Share size={18} className="text-blue-600" aria-label={t("Deila")} /> {t("Deila neðst í Safari")}
            </Step>
            <Step n={2}>
              {t("Veldu")} <SquarePlus size={18} aria-hidden /> {t("„Setja á heimaskjá“ (Add to Home Screen)")}
            </Step>
            <Step n={3}>{t("Ýttu á „Bæta við“ efst til hægri")}</Step>
          </ol>
        ) : (
          <>
            <ol className="space-y-3">
              <Step n={1}>
                {t("Ýttu á")} <EllipsisVertical size={18} aria-label="⋮" /> {t("efst til hægri í Chrome")}
              </Step>
              <Step n={2}>{t("Veldu „Setja upp forrit“ eða „Bæta við heimaskjá“")}</Step>
              <Step n={3}>{t("Staðfestu með „Setja upp“")}</Step>
            </ol>
            <p className="mt-4 text-sm text-stone-500">{t("Í tölvu: smelltu á uppsetningartáknið hægra megin í slóðarstikunni í Chrome eða Edge.")}</p>
          </>
        )}
      </div>
    </BottomSheet>
  );
}

// Röð í Ég-flipanum, alltaf aðgengileg nema appið sé þegar opið sem app
export function InstallRow() {
  const { t } = useT();
  const { mode, install, sheet, closeSheet } = useInstall();
  // Nýbúið að setja upp í þessum vafra: appið er komið, en röðin má vera ef Chrome býður það aftur
  if (!mode || mode === "installed" || (installedBefore() && mode !== "prompt")) return null;

  return (
    <>
      <button type="button" onClick={install} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-stone-100">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-orange-500/15 text-orange-600">
          <Smartphone size={19} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-stone-900">{t("Sækja appið")}</span>
          <span className="block truncate text-sm text-stone-500">{t("Partar á heimaskjáinn, með tilkynningum")}</span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-stone-400" aria-hidden />
      </button>
      <InstallSheet open={sheet} onClose={closeSheet} mode={mode} />
    </>
  );
}

const VISITS_KEY = "partar_heimsoknir";
const DISMISSED_KEY = "partar_app_spurt";
const ASK_AGAIN_MS = 14 * 24 * 60 * 60 * 1000;

// Borði á forsíðu (sími): frá og með annarri heimsókn, ekki aftur í 14 daga ef lokað
export function InstallBanner() {
  const { t } = useT();
  const { mode, install, sheet, closeSheet } = useInstall();
  const [eligible, setEligible] = useState(false);

  useEffect(() => {
    try {
      let visits = Number(localStorage.getItem(VISITS_KEY) ?? 0);
      if (!sessionStorage.getItem(VISITS_KEY)) {
        sessionStorage.setItem(VISITS_KEY, "1");
        visits += 1;
        localStorage.setItem(VISITS_KEY, String(visits));
      }
      const dismissed = Date.now() - Number(localStorage.getItem(DISMISSED_KEY) ?? 0) < ASK_AGAIN_MS;
      setEligible(visits >= 2 && !dismissed && !installedBefore());
    } catch {
      setEligible(false);
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {}
    setEligible(false);
  }

  if (!eligible || !mode || mode === "installed" || mode === "in-app" || installedBefore()) return null;

  return (
    <div className="mt-5 flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900 md:hidden">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-orange-600 text-white">
        <Smartphone size={20} />
      </span>
      <p className="min-w-0 flex-1">
        <span className="block font-semibold">{t("Sæktu Partar appið")}</span>
        <span className="block text-orange-800">{t("Fáðu tilkynningu um leið og parturinn kemur.")}</span>
      </p>
      <button type="button" onClick={install} className="shrink-0 rounded-full bg-orange-600 px-3 py-1.5 font-semibold text-white active:scale-95">
        {t("Sækja")}
      </button>
      <button type="button" onClick={dismiss} aria-label={t("Ekki núna")} className="-mr-1 shrink-0 p-1 text-orange-700">
        <X size={18} />
      </button>
      <InstallSheet open={sheet} onClose={closeSheet} mode={mode} />
    </div>
  );
}
