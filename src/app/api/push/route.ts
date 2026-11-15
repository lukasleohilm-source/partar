import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import { sendWebPush, type PushSubscriptionKeys } from "@/lib/web-push";

// Gagnagrunnurinn (pg_net) kallar hingað þegar ný skilaboð eða óska-tilkynning verða til.
// Leyndarlykillinn í hausnum er sannreyndur af push_payload() í gagnagrunninum.

type Payload = {
  user: string;
  kind: string;
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

  // Tölvupóstur ef notandinn leyfir (claim_email athugar stillingar og takmarkar við einn á 30 mín. á hvert efni)
  const email = async (): Promise<number | string> => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return "not_configured";
    const { data: to } = await supabase.rpc("claim_email", { p_secret: secret, p_user: payload.user, p_tag: payload.message.tag });
    if (!to) return "skipped";
    return sendEmail({
      apiKey: apiKey.trim(),
      from: process.env.EMAIL_FROM ?? "Partar <partar@lukels255.com>",
      to: to as string,
      kind: payload.kind,
      message: payload.message,
      siteUrl: process.env.SITE_URL ?? "https://partar.lukels255.com",
    });
  };

  // Engin ýtiáskrift (t.d. iPhone án heimaskjás) → aðeins tölvupóstur
  if (!payload.subscriptions.length) return Response.json({ sent: 0, email: await email() });

  // BOM getur fylgt ef leyndarbreytan var sett úr PowerShell
  const jwk = JSON.parse(privateJwk.replace(/^﻿/, "")) as JsonWebKey;
  const vapid = { privateJwk: jwk, subject: process.env.SITE_URL ?? "https://partar.lukels255.com" };
  const results = await Promise.allSettled(
    payload.subscriptions.map((s) => sendWebPush(s, payload.message, vapid, { topic: payload.message.tag })),
  );

  // Útrunnar áskriftir fjarlægðar
  const gone = results.flatMap((r) => (r.status === "fulfilled" && r.value.gone ? [r.value.endpoint] : []));
  await Promise.all(gone.map((endpoint) => supabase.rpc("remove_push_subscription", { p_secret: secret, p_endpoint: endpoint })));
  const sent = results.filter((r) => r.status === "fulfilled" && r.value.status < 300).length;

  // Ósk sem passar og verðlækkun gerast sjaldan og skipta máli: alltaf líka tölvupóstur, því ýtitilkynning
  // getur „heppnast“ án þess að sjást (t.d. app fjarlægt af heimaskjá). Spjall: póstur ef engin ýting komst til skila.
  const alsoEmail = payload.kind === "wanted_match" || payload.kind === "price_drop" || sent === 0;

  return Response.json({
    sent,
    removed: gone.length,
    statuses: results.map((r) => (r.status === "fulfilled" ? r.value.status : "error")),
    email: alsoEmail ? await email() : "push_only",
  });
}
