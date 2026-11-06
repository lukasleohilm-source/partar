"use client";

import { Bell, Mail, Share, SquarePlus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { enablePush, getPushState } from "@/lib/push-client";
import { reportError } from "@/lib/report-error";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/lang-provider";

const DISMISSED_KEY = "partar_push_spurt";
const ASK_AGAIN_MS = 14 * 24 * 60 * 60 * 1000;

// Spyr um tilkynningar þegar þær skipta máli (t.d. eftir að maður sendir skilaboð),
// ekki um leið og síðan opnast. Vafrar fela leyfisglugga sem birtast án ástæðu.
// Ýtitilkynningar þar sem vafrinn styður þær, leiðarvísir á iPhone, annars tölvupóstur
// (gestir án netfangs eru þá beðnir að vista aðganginn).
export function PushPrompt({ reason }: { reason: string }) {
  const { t } = useT();
  const [mode, setMode] = useState<"push" | "install" | "save" | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      if (Date.now() - Number(localStorage.getItem(DISMISSED_KEY) ?? 0) < ASK_AGAIN_MS) return;
    } catch {
      return;
    }
    getPushState()
      .then(async (s) => {
        if (s === "off") return setMode("push");
        if (s === "ios-install") return setMode("install");
        if (s === "on") return;
        const {
          data: { user },
        } = await createClient().auth.getUser();
        if (user && !user.email) setMode("save");
      })
      .catch(() => {});
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {}
    setMode(null);
  }

  async function enable() {
    setBusy(true);
    try {
      const result = await enablePush();
      if (result === "on") {
        setDone(true);
        setTimeout(() => setMode(null), 2500);
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

  if (!mode) return null;

  // iPhone: Web Push virkar aðeins eftir „Setja á heimaskjá“
  if (mode === "install") {
    return (
      <div className="my-3 rounded-2xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
        <div className="flex items-start gap-3">
          <Bell size={20} className="mt-0.5 shrink-0 text-orange-600" />
          <p className="flex-1">
            {reason} {t("Settu Partar á heimaskjáinn og þú færð tilkynningu í símann eins og frá appi.")}
          </p>
          <button type="button" onClick={dismiss} aria-label={t("Ekki núna")} className="-mr-1 shrink-0 p-1 text-orange-700">
            <X size={18} />
          </button>
        </div>
        <ol className="mt-2 space-y-1.5 pl-8">
          <li className="flex items-center gap-1.5">
            <span className="font-bold">1.</span> {t("Ýttu á")} <Share size={15} className="text-blue-600" aria-label={t("Deila")} /> {t("Deila neðst í Safari")}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="font-bold">2.</span> {t("Veldu")} <SquarePlus size={15} aria-hidden /> {t("„Setja á heimaskjá“ (Add to Home Screen)")}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="font-bold">3.</span> {t("Opnaðu Partar af heimaskjánum, skráðu þig inn og kveiktu á tilkynningum")}
          </li>
        </ol>
      </div>
    );
  }

  const Icon = mode === "save" ? Mail : Bell;
  const action = "shrink-0 rounded-full bg-orange-600 px-3 py-1.5 font-semibold text-white active:scale-95 disabled:opacity-60";

  return (
    <div className="my-3 flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
      <Icon size={20} className="shrink-0 text-orange-600" />
      {done ? (
        <p className="flex-1 font-medium">{t("Kveikt á tilkynningum ✓")}</p>
      ) : (
        <>
          <p className="flex-1">{mode === "save" ? `${reason} ${t("Vistaðu aðganginn og við sendum þér tölvupóst.")}` : reason}</p>
          {mode === "save" ? (
            <Link href="/profill/vista" className={action}>
              {t("Vista")}
            </Link>
          ) : (
            <button type="button" onClick={enable} disabled={busy} className={action}>
              {t("Kveikja")}
            </button>
          )}
          <button type="button" onClick={dismiss} aria-label={t("Ekki núna")} className="-mr-1 shrink-0 p-1 text-orange-700">
            <X size={18} />
          </button>
        </>
      )}
    </div>
  );
}
