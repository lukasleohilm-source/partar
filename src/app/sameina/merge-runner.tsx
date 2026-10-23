"use client";

import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MERGE_TOKEN_KEY } from "@/components/oauth-buttons";
import { createClient } from "@/lib/supabase/client";

type State = { status: "working" } | { status: "done"; listings: number } | { status: "error" };

export function MergeRunner({ next }: { next: string }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "working" });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = localStorage.getItem(MERGE_TOKEN_KEY);
    if (!token) {
      router.replace(next);
      return;
    }
    createClient()
      .rpc("claim_merge_token", { p_token: token })
      .then(({ data, error }) => {
        localStorage.removeItem(MERGE_TOKEN_KEY);
        if (error) return setState({ status: "error" });
        setState({ status: "done", listings: (data as number) ?? 0 });
        setTimeout(() => {
          router.replace(next);
          router.refresh();
        }, 1800);
      });
  }, [next, router]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 pt-24 text-center">
      {state.status === "working" && (
        <>
          <Loader2 size={40} className="animate-spin text-orange-600" />
          <h1 className="mt-4 text-xl font-extrabold">Flyt gögnin þín…</h1>
          <p className="mt-2 text-stone-600">Auglýsingar, skilaboð og óskir færast yfir á aðganginn þinn.</p>
        </>
      )}
      {state.status === "done" && (
        <>
          <CheckCircle2 size={48} className="text-green-600" />
          <h1 className="mt-4 text-xl font-extrabold">Allt komið!</h1>
          <p className="mt-2 text-stone-600">
            {state.listings > 0
              ? `${state.listings} ${state.listings === 1 ? "auglýsing" : "auglýsingar"} og annað frá gestaaðganginum er nú á aðganginum þínum.`
              : "Gögn gestaaðgangsins eru nú á aðganginum þínum."}
          </p>
        </>
      )}
      {state.status === "error" && (
        <>
          <TriangleAlert size={48} className="text-orange-600" />
          <h1 className="mt-4 text-xl font-extrabold">Ekki tókst að flytja gögnin</h1>
          <p className="mt-2 text-stone-600">
            Þú ert innskráð(ur), en flutningurinn rann út eða mistókst. Gestaaðgangurinn er óbreyttur.
          </p>
          <Link href={next} className="mt-6 rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white">
            Halda áfram
          </Link>
        </>
      )}
    </div>
  );
}
