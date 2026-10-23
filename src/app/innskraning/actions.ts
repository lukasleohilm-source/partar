"use server";

import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";
import { confirmUrl, siteOrigin } from "@/lib/site-url";

export type LoginState = { status: "idle" | "sent" | "error"; email?: string; message?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function errorMessage(status: number | undefined, fallback: string): string {
  if (status === 429) return "Of margar tilraunir. Bíddu aðeins og reyndu aftur.";
  return fallback;
}

// Innskráning með töfrahlekk (nýr eða núverandi aðgangur)
export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = safeNext(String(formData.get("next") ?? ""));
  const captchaToken = String(formData.get("captcha") ?? "") || undefined;

  if (!EMAIL_RE.test(email)) {
    return { status: "error", email, message: "Sláðu inn gilt netfang." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: confirmUrl(await siteOrigin(), next), shouldCreateUser: true, captchaToken },
  });

  if (error) return { status: "error", email, message: errorMessage(error.status, "Ekki tókst að senda hlekk. Reyndu aftur.") };
  return { status: "sent", email };
}

// Tengir netfang við núverandi (nafnlausan) aðgang svo auglýsingar og spjall haldist
export async function linkEmail(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return { status: "error", email, message: "Sláðu inn gilt netfang." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: confirmUrl(await siteOrigin(), "/profill?vistad=1") },
  );

  if (error) {
    const taken = error.code === "email_exists" || /already/i.test(error.message);
    return {
      status: "error",
      email,
      message: taken
        ? "Þetta netfang er þegar í notkun. Skráðu þig inn með því í staðinn."
        : errorMessage(error.status, "Ekki tókst að senda staðfestingu. Reyndu aftur."),
    };
  }
  return { status: "sent", email };
}
