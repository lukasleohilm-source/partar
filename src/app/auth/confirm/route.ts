import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

// Hlekkir úr tölvupósti og innskráning með Google enda hér.
// Google og sjálfgefin póstsniðmát skila `code` (PKCE); eigin póstsniðmát skila `token_hash`.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = (searchParams.get("type") ?? "email") as EmailOtpType;
  const next = safeNext(searchParams.get("next"));
  const back = (villa: string) =>
    NextResponse.redirect(new URL(`/innskraning?villa=${villa}&next=${encodeURIComponent(next)}`, origin));

  // Villa frá Google/Supabase (t.d. hætt við, eða Google-aðgangur þegar tengdur öðrum notanda)
  const errorCode = searchParams.get("error_code") ?? searchParams.get("error");
  if (errorCode) {
    if (errorCode === "identity_already_exists" || errorCode === "email_exists") return back("google_til");
    if (errorCode === "access_denied") return back("haett_vid");
    return back("google");
  }

  const supabase = await createClient();
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  } else if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  return back("hlekkur");
}
