"use client";

import { INSTALL_EVENT } from "@/lib/install-script";
import { isIos } from "@/lib/push-client";

// Uppsetning Partar á heimaskjá (PWA).
// Chrome/Edge/Samsung senda `beforeinstallprompt`; INSTALL_LISTENER (install-script.ts) í layout grípur hann
// strax við hleðslu (áður en React fer í gang) og geymir í window.__partarInstall.

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __partarInstall?: InstallPromptEvent | null;
  }
}

export { INSTALL_EVENT };

// installed: þegar opið sem app · prompt: eitt smell (Chrome o.fl.) · ios: leiðarvísir fyrir Safari
// in-app: vafri inni í Facebook o.fl. · manual: leiðarvísir fyrir valmynd vafrans
export type InstallMode = "installed" | "prompt" | "ios" | "in-app" | "manual";

export function getInstallMode(): InstallMode {
  if (window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && Boolean(navigator.standalone))) {
    return "installed";
  }
  if (/FBAN|FBAV|FB_IAB|Instagram|Messenger|Line\/|Snapchat|TikTok/i.test(navigator.userAgent)) return "in-app";
  if (window.__partarInstall) return "prompt";
  if (isIos()) return "ios";
  return "manual";
}

// Sett upp áður í þessum vafra (Chrome sendir þá ekki beforeinstallprompt aftur)
export function installedBefore(): boolean {
  try {
    return localStorage.getItem("partar_installed") === "1";
  } catch {
    return false;
  }
}

export async function promptInstall(): Promise<boolean> {
  const e = window.__partarInstall;
  if (!e) return false;
  await e.prompt();
  const { outcome } = await e.userChoice;
  window.__partarInstall = null;
  window.dispatchEvent(new Event(INSTALL_EVENT));
  return outcome === "accepted";
}
