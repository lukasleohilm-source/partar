"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { registerServiceWorker, resyncPush } from "@/lib/push-client";
import { createClient } from "@/lib/supabase/client";

// Skráir service worker og tengir núverandi ýtiáskrift við innskráðan notanda.
// Ef forsíðan kom úr geymslu símans (hröð ræsing af heimaskjá) er ferskt efni sótt strax.
export function ServiceWorker() {
  const router = useRouter();

  useEffect(() => {
    if (document.documentElement.dataset.swCache) {
      delete document.documentElement.dataset.swCache;
      router.refresh();
    }

    registerServiceWorker()
      .then(async () => {
        // Segir service worker hver er innskráður (lesið úr vafrakökunni, engin netbeiðni),
        // svo geymd forsíða annars notanda sé aldrei sýnd eftir útskráningu
        const { data } = await createClient().auth.getSession();
        const reg = await navigator.serviceWorker.ready;
        reg.active?.postMessage({ type: "notandi", id: data.session?.user.id ?? "" });
        await resyncPush();
      })
      .catch(() => {});
  }, [router]);

  return null;
}
