"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/lang-provider";
import { createClient } from "@/lib/supabase/client";

// Google-innskráning á okkar léni: hnappur Google sjálfs (Google Identity Services) opnar
// sprettiglugga sem segir „Halda áfram í partar.lukels255.com“, í stað Supabase-slóðarinnar.
// Google skilar ID-tóka sem Supabase staðfestir (signInWithIdToken / linkIdentity).
// Engin áframsendingarslóð er notuð, aðeins „Authorized JavaScript origins“ í Google Cloud.
// Auðkenni biðlarans er opinbert (það sést hvort eð er í hverri innskráningu).
export const GOOGLE_CLIENT_ID = "979094033986-fe810euugsmcpnhncgkbseuk38tsj4pq.apps.googleusercontent.com";
const GSI_SRC = "https://accounts.google.com/gsi/client";

type GsiButtonOptions = {
  type: "standard";
  theme: "outline" | "filled_black";
  size: "large";
  text: "continue_with";
  shape: "rectangular";
  logo_alignment: "center";
  width: number;
  locale: string;
};
type Gsi = {
  accounts: {
    id: {
      initialize: (o: {
        client_id: string;
        callback: (r: { credential: string }) => void;
        nonce: string;
        ux_mode: "popup";
        auto_select: boolean;
        itp_support: boolean;
        use_fedcm_for_button?: boolean;
      }) => void;
      renderButton: (el: HTMLElement, o: GsiButtonOptions) => void;
    };
  };
};
declare global {
  interface Window {
    google?: Gsi;
  }
}

let loading: Promise<Gsi> | null = null;
function loadGsi(): Promise<Gsi> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (!loading) {
    loading = new Promise<Gsi>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = GSI_SRC;
      s.async = true;
      s.onload = () => (window.google?.accounts?.id ? resolve(window.google) : reject(new Error("gsi")));
      s.onerror = () => reject(new Error("gsi"));
      document.head.appendChild(s);
      setTimeout(() => reject(new Error("gsi-timeout")), 8000);
    }).catch((e: unknown) => {
      loading = null;
      throw e;
    });
  }
  return loading;
}

function randomHex(bytes = 16): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, "0")).join("");
}
async function sha256Hex(s: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Google-hnappur sem keyrir á síðunni sjálfri. `onUnavailable` er kallað ef Google-skriftan
 * hleðst ekki eða Supabase hafnar tókanum af tæknilegum ástæðum; þá tekur gamli hnappurinn við.
 */
export function GoogleIdButton({ next, onUnavailable }: { next: string; onUnavailable: () => void }) {
  const { t, lang } = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const gsi = await loadGsi();
        if (cancelled || !ref.current) return;
        // Supabase ber SHA-256 af hráa gildinu saman við nonce í tókanum
        const rawNonce = randomHex();
        gsi.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce: await sha256Hex(rawNonce),
          ux_mode: "popup",
          auto_select: false,
          itp_support: true,
          use_fedcm_for_button: true,
          callback: async ({ credential }) => {
            setBusy(true);
            setError(null);
            const supabase = createClient();
            const {
              data: { session },
            } = await supabase.auth.getSession();
            const creds = { provider: "google" as const, token: credential, nonce: rawNonce };
            // Gestur: Google tengt við gestaaðganginn svo auglýsingar og skilaboð haldist
            const { error } = session?.user.is_anonymous
              ? await supabase.auth.linkIdentity(creds)
              : await supabase.auth.signInWithIdToken(creds);
            if (!error) return window.location.assign(next);
            setBusy(false);
            if (/already|exists/i.test(error.message)) {
              return window.location.assign(`/innskraning?villa=google_til&next=${encodeURIComponent(next)}`);
            }
            // T.d. CAPTCHA eða stilling í Supabase: gamla leiðin virkar áfram
            if (/captcha|not enabled|client id|audience/i.test(error.message)) return onUnavailable();
            setError(t("Ekki tókst að tengjast {nafn}. Reyndu aftur.", { nafn: "Google" }));
          },
        });
        const dark = document.documentElement.dataset.theme !== "light";
        gsi.accounts.id.renderButton(ref.current, {
          type: "standard",
          theme: dark ? "filled_black" : "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "center",
          width: Math.min(400, Math.max(200, Math.round(ref.current.getBoundingClientRect().width))),
          locale: lang === "en" ? "en" : "is",
        });
      } catch {
        if (!cancelled) onUnavailable();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [next, lang, onUnavailable, t]);

  return (
    <div>
      {/* Hæð frátekin svo síðan hoppi ekki meðan hnappurinn hleðst */}
      <div ref={ref} className={`flex min-h-[44px] w-full justify-center ${busy ? "pointer-events-none opacity-60" : ""}`} />
      {error && (
        <p role="alert" className="mt-2 text-center text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
