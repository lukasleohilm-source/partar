"use client";

import { b64urlDecode, b64urlEncode } from "@/lib/web-push";
import { createClient } from "@/lib/supabase/client";

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export type PushState = "mobile" | "unsupported" | "in-app" | "ios-install" | "ios-old" | "denied" | "off" | "on";

export function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

// Í símum notum við tölvupóst í stað ýtitilkynninga (enginn heimaskjár). Sett upp sem app → ýtitilkynningar.
export function isMobileWeb(): boolean {
  return (/Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent) || isIos()) && !isStandalone();
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && Boolean(navigator.standalone));
}

// Vafrar innbyggðir í Facebook, Messenger, Instagram o.fl. styðja ekki tilkynningar
function isInAppBrowser(): boolean {
  return /FBAN|FBAV|FB_IAB|Instagram|Messenger|Line\/|Snapchat|TikTok/i.test(navigator.userAgent);
}

// Web Push á iPhone kom í iOS 16.4
function iosTooOld(): boolean {
  const m = navigator.userAgent.match(/OS (\d+)_(\d+)/);
  if (!m) return false;
  const [major, minor] = [Number(m[1]), Number(m[2])];
  return major < 16 || (major === 16 && minor < 4);
}

function withTimeout<T>(p: Promise<T>, ms: number, step: string): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timeout: ${step}`)), ms))]);
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export async function getPushState(): Promise<PushState> {
  if (isMobileWeb()) return "mobile";
  if (isInAppBrowser()) return "in-app";
  if (!VAPID_PUBLIC_KEY || !("serviceWorker" in navigator)) return "unsupported";
  // iPhone styður Web Push aðeins þegar appið hefur verið sett á heimaskjá
  if (!("PushManager" in window) || !("Notification" in window)) {
    if (!isIos()) return "unsupported";
    if (iosTooOld()) return "ios-old";
    return isStandalone() ? "unsupported" : "ios-install";
  }
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

async function save(sub: PushSubscription) {
  const json = sub.toJSON();
  const { error } = await createClient().rpc("save_push_subscription", {
    p_endpoint: sub.endpoint,
    p_p256dh: json.keys?.p256dh ?? b64urlEncode(new Uint8Array(sub.getKey("p256dh")!)),
    p_auth: json.keys?.auth ?? b64urlEncode(new Uint8Array(sub.getKey("auth")!)),
  });
  if (error) throw new Error(`save: ${error.message}`);
}

// "dismissed" þýðir að notandinn lokaði leyfisglugganum án þess að velja
export async function enablePush(): Promise<PushState | "dismissed"> {
  // Leyfisbeiðnin verður að koma beint úr smellinum, á undan öllu öðru (krafa á iPhone)
  const permission = await Notification.requestPermission();
  if (permission === "denied") return "denied";
  if (permission !== "granted") return "dismissed";
  const reg = await withTimeout(registerServiceWorker(), 10000, "register");
  if (!reg) throw new Error("no service worker");
  await withTimeout(navigator.serviceWorker.ready, 10000, "ready");
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await withTimeout(
      reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64urlDecode(VAPID_PUBLIC_KEY) }),
      15000,
      "subscribe",
    ));
  await save(sub);
  return "on";
}

export async function disablePush(): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await createClient().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  }
  return "off";
}

// Endurskráir áskrift ef hún er til (t.d. eftir að notandi skipti um aðgang í sama vafra)
export async function resyncPush(): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
  if (Notification.permission !== "granted") return;
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (sub) await save(sub).catch(() => {});
}
