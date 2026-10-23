"use client";

import { useEffect } from "react";
import { registerServiceWorker, resyncPush } from "@/lib/push-client";

// Skráir service worker og tengir núverandi ýtiáskrift við innskráðan notanda
export function ServiceWorker() {
  useEffect(() => {
    registerServiceWorker()
      .then(() => resyncPush())
      .catch(() => {});
  }, []);
  return null;
}
