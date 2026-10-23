"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`);
    const s = existing ?? Object.assign(document.createElement("script"), { src: SCRIPT, async: true });
    s.addEventListener("load", () => resolve());
    s.addEventListener("error", () => reject(new Error("turnstile_load_failed")));
    if (!existing) document.head.appendChild(s);
  });
}

// Cloudflare Turnstile (CAPTCHA). Oftast ósýnilegt; sýnir þraut aðeins ef grunur vaknar.
export function Turnstile({ onToken, onError }: { onToken: (token: string) => void; onError: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let widgetId: string | null = null;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        widgetId = window.turnstile.render(ref.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: onToken,
          "error-callback": onError,
          language: "auto",
        });
      })
      .catch(onError);
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [onToken, onError]);

  return <div ref={ref} className="flex justify-center" />;
}
