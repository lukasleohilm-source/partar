import { NextResponse, type NextRequest } from "next/server";
import { KENNI_CALLBACK_PATH, KENNI_CLIENT_ID, KENNI_FLOW_COOKIE, KENNI_ISSUER, readIdToken, type KenniFlow } from "@/lib/kenni";
import { createClient } from "@/lib/supabase/server";

// Kenni skilar notandanum hingað. Kóða skipt út fyrir tóka á þjóninum (með leynilykli),
// kennitala og nafn lesin og staðfestingin skráð í gagnagrunninn.
export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const done = (result: string) => {
    const res = NextResponse.redirect(new URL(`/profill?stadfesting=${result}`, origin));
    res.cookies.delete({ name: KENNI_FLOW_COOKIE, path: KENNI_CALLBACK_PATH });
    return res;
  };

  if (searchParams.get("error")) return done(searchParams.get("error") === "access_denied" ? "haett" : "villa");

  let flow: KenniFlow;
  try {
    flow = JSON.parse(request.cookies.get(KENNI_FLOW_COOKIE)?.value ?? "");
  } catch {
    return done("utrunnid");
  }
  const code = searchParams.get("code");
  if (!code || searchParams.get("state") !== flow.state) return done("utrunnid");

  const clientSecret = process.env.KENNI_CLIENT_SECRET;
  const verifySecret = process.env.KENNI_VERIFY_SECRET;
  if (!clientSecret || !verifySecret) return done("ekki-tilbuid");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/byrja?next=/profill", origin));

  const tokenRes = await fetch(`${KENNI_ISSUER}/oidc/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${origin}${KENNI_CALLBACK_PATH}`,
      client_id: KENNI_CLIENT_ID,
      client_secret: clientSecret,
      code_verifier: flow.verifier,
    }),
  });
  if (!tokenRes.ok) return done("villa");
  const tokens = (await tokenRes.json()) as { id_token?: string; access_token?: string };
  if (!tokens.id_token) return done("villa");

  let claims: Record<string, unknown>;
  try {
    claims = readIdToken(tokens.id_token);
  } catch {
    return done("villa");
  }
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  const expired = typeof claims.exp !== "number" || claims.exp * 1000 < Date.now();
  if (claims.iss !== KENNI_ISSUER || !aud.includes(KENNI_CLIENT_ID) || claims.nonce !== flow.nonce || expired) {
    return done("villa");
  }
  // Fyrirtækjaumboð eru ekki leyfð: aðeins einstaklingur sem skráir sig inn sjálfur
  if (claims.actor) return done("villa");
  // Kennitala og nafn eru oftast í ID-tókanum; annars sótt frá /oidc/me (sama notandi, sub athugað)
  if (!claims.national_id && tokens.access_token) {
    const me = await fetch(`${KENNI_ISSUER}/oidc/me`, { headers: { authorization: `Bearer ${tokens.access_token}` } });
    if (me.ok) {
      const info = (await me.json()) as Record<string, unknown>;
      if (info.sub === claims.sub) claims = { ...info, ...claims, national_id: info.national_id, audkenni_name: claims.audkenni_name ?? info.audkenni_name };
    }
  }
  const nationalId = String(claims.national_id ?? "");
  const name = String(claims.audkenni_name ?? claims.name ?? "");

  const { error } = await supabase.rpc("complete_identity_verification", {
    p_secret: verifySecret,
    p_user: user.id,
    p_national_id: nationalId,
    p_name: name,
  });
  if (error) return done(/already_verified_elsewhere/.test(error.message) ? "annar-adgangur" : "villa");
  return done("ok");
}
