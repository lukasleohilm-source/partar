"use client";

import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { GOOGLE_FLOW_KEY, type GoogleFlow } from "@/lib/google";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/client";

// Google skilar hingað með ID-tóka í slóðinni (#id_token=…). Hann er afhentur Supabase,
// sem staðfestir undirskrift og nonce, og svo er haldið áfram þangað sem notandinn var.
export default function GoogleReturnPage() {
  useEffect(() => {
    void (async () => {
      const params = new URLSearchParams(window.location.hash.slice(1));
      let flow: GoogleFlow | null = null;
      try {
        flow = JSON.parse(sessionStorage.getItem(GOOGLE_FLOW_KEY) ?? "null");
        sessionStorage.removeItem(GOOGLE_FLOW_KEY);
      } catch {}
      const next = safeNext(flow?.next);
      const back = (villa: string) => window.location.replace(`/innskraning?villa=${villa}&next=${encodeURIComponent(next)}`);

      if (params.get("error")) return back(params.get("error") === "access_denied" ? "haett_vid" : "google");
      const token = params.get("id_token");
      if (!flow || !token || params.get("state") !== flow.state) return back("google");

      const supabase = createClient();
      const credentials = { provider: "google", token, nonce: flow.nonce };
      const { error } = flow.link ? await supabase.auth.linkIdentity(credentials) : await supabase.auth.signInWithIdToken(credentials);
      if (error) {
        // Google-aðgangurinn er þegar til sem sér notandi → bjóða sameiningu
        return back(error.code === "identity_already_exists" || error.code === "email_exists" ? "google_til" : "google");
      }
      window.location.replace(safeNext(flow.target, next));
    })();
  }, []);

  return (
    <div className="grid min-h-dvh place-items-center">
      <p className="flex items-center gap-2 text-stone-600">
        <Loader2 size={20} className="animate-spin" /> Skrái inn…
      </p>
    </div>
  );
}
