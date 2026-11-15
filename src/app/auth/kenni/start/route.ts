import { NextResponse, type NextRequest } from "next/server";
import { KENNI_CALLBACK_PATH, KENNI_CLIENT_ID, KENNI_FLOW_COOKIE, KENNI_ISSUER, KENNI_SCOPES, pkceChallenge, randomToken } from "@/lib/kenni";
import { createClient } from "@/lib/supabase/server";

// Hefur staðfestingu: sendir innskráðan notanda til Kenni með state, nonce og PKCE
export async function GET(request: NextRequest) {
  const { origin } = request.nextUrl;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/byrja?next=/profill", origin));

  const flow = { state: randomToken(), nonce: randomToken(), verifier: randomToken(48) };
  const url = new URL(`${KENNI_ISSUER}/oidc/auth`);
  url.search = new URLSearchParams({
    client_id: KENNI_CLIENT_ID,
    response_type: "code",
    scope: KENNI_SCOPES,
    redirect_uri: `${origin}${KENNI_CALLBACK_PATH}`,
    state: flow.state,
    nonce: flow.nonce,
    code_challenge: await pkceChallenge(flow.verifier),
    code_challenge_method: "S256",
    // Alltaf ný auðkenning, svo enginn staðfesti sig á lotu einhvers annars í sama vafra
    prompt: "login",
    ui_locales: request.cookies.get("partar_lang")?.value === "en" ? "en" : "is",
  }).toString();

  const res = NextResponse.redirect(url);
  res.cookies.set(KENNI_FLOW_COOKIE, JSON.stringify(flow), {
    httpOnly: true,
    secure: origin.startsWith("https"),
    sameSite: "lax",
    path: KENNI_CALLBACK_PATH,
    maxAge: 600,
  });
  return res;
}
