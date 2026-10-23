import { createClient } from "@supabase/supabase-js";
import { sendWebPush, type PushSubscriptionKeys } from "@/lib/web-push";

// Gagnagrunnurinn (pg_net) kallar hingað þegar ný skilaboð eða óska-tilkynning verða til.
// Leyndarlykillinn í hausnum er sannreyndur af push_payload() í gagnagrunninum.

type Payload = {
  message: { title: string; body: string; url: string; tag: string };
  subscriptions: PushSubscriptionKeys[];
} | null;

export async function POST(request: Request) {
  const secret = request.headers.get("x-partar-secret");
  const privateJwk = process.env.VAPID_PRIVATE_JWK;
  if (!secret || !privateJwk) return new Response("Forbidden", { status: 403 });

  let kind: string, id: string;
  try {
    ({ kind, id } = await request.json());
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.rpc("push_payload", { p_secret: secret, p_kind: kind, p_id: String(id) });
  if (error) return new Response("Forbidden", { status: 403 });

  const payload = data as Payload;
  if (!payload) return Response.json({ sent: 0 });

  // BOM getur fylgt ef leyndarbreytan var sett úr PowerShell
  const jwk = JSON.parse(privateJwk.replace(/^﻿/, "")) as JsonWebKey;
  const vapid = { privateJwk: jwk, subject: process.env.SITE_URL ?? "https://partar.lukels255.com" };
  const results = await Promise.allSettled(
    payload.subscriptions.map((s) => sendWebPush(s, payload.message, vapid, { topic: payload.message.tag })),
  );

  // Útrunnar áskriftir fjarlægðar
  const gone = results.flatMap((r) => (r.status === "fulfilled" && r.value.gone ? [r.value.endpoint] : []));
  await Promise.all(gone.map((endpoint) => supabase.rpc("remove_push_subscription", { p_secret: secret, p_endpoint: endpoint })));

  return Response.json({
    sent: results.filter((r) => r.status === "fulfilled" && r.value.status < 300).length,
    removed: gone.length,
    statuses: results.map((r) => (r.status === "fulfilled" ? r.value.status : "error")),
  });
}
