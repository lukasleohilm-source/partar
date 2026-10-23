"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Opinbert Google „G“-merki (litir samkvæmt leiðbeiningum Google)
function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

type Mode = "auto" | "signin" | "merge";

export const MERGE_TOKEN_KEY = "partar_sameina";

// „Halda áfram með Google“. Gestur tengir Google við núverandi aðgang (gögn haldast);
// annars er skráð inn. `mode="signin"` skráir alltaf inn (t.d. ef Google-aðgangurinn er þegar til).
export function GoogleButton({ next = "/", mode = "auto", label }: { next?: string; mode?: Mode; label?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setPending(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Sameining: gesturinn fær einnota lykil áður en skráð er inn á hinn aðganginn
    let target = next;
    if (mode === "merge" && session?.user.is_anonymous) {
      const { data: token, error: tokenError } = await supabase.rpc("create_merge_token");
      if (tokenError || !token) {
        setPending(false);
        return setError("Ekki tókst að undirbúa flutning gagna. Reyndu aftur.");
      }
      localStorage.setItem(MERGE_TOKEN_KEY, token as string);
      target = `/sameina?next=${encodeURIComponent(next)}`;
    }
    const redirectTo = `${window.location.origin}/auth/confirm?next=${encodeURIComponent(target)}`;

    const { error } =
      mode === "auto" && session?.user.is_anonymous
        ? await supabase.auth.linkIdentity({ provider: "google", options: { redirectTo } })
        : await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });

    // Ef allt gengur upp fer vafrinn til Google og þessi kóði keyrir ekki lengra
    if (error) {
      setPending(false);
      setError(
        /provider is not enabled|Unsupported provider/i.test(error.message)
          ? "Google-innskráning er ekki komin í gagnið enn."
          : "Ekki tókst að tengjast Google. Reyndu aftur.",
      );
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={go}
        disabled={pending}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-stone-300 bg-surface py-3 text-base font-semibold text-stone-800 shadow-sm transition active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? <Loader2 size={20} className="animate-spin" /> : <GoogleLogo />}
        {label ?? "Halda áfram með Google"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-center text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="my-4 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-stone-400">
      <span className="h-px flex-1 bg-stone-200" />
      eða
      <span className="h-px flex-1 bg-stone-200" />
    </div>
  );
}
