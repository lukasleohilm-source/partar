"use server";

import { redirect } from "next/navigation";
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

// ——— Lykilorð (eins og á flestum síðum): innskráning, nýskráning, gleymt og nýtt lykilorð ———

const MIN_PASSWORD = 8; // "use server"-skrá má aðeins flytja út föll

function authError(error: { status?: number; code?: string; message: string }, fallback: string): string {
  if (error.status === 429 || error.code === "over_request_rate_limit" || error.code === "over_email_send_rate_limit")
    return "Of margar tilraunir. Bíddu aðeins og reyndu aftur.";
  if (error.code === "captcha_failed" || /captcha/i.test(error.message)) return "Öryggisathugun mistókst. Reyndu aftur.";
  if (error.code === "weak_password") return `Lykilorðið þarf að vera að minnsta kosti ${MIN_PASSWORD} stafir.`;
  return fallback;
}

export async function signInWithPassword(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));
  const captchaToken = String(formData.get("captcha") ?? "") || undefined;
  if (!EMAIL_RE.test(email)) return { status: "error", email, message: "Sláðu inn gilt netfang." };
  if (!password) return { status: "error", email, message: "Sláðu inn lykilorð." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } });
  if (error) {
    if (error.code === "invalid_credentials")
      return { status: "error", email, message: "Rangt netfang eða lykilorð." };
    if (error.code === "email_not_confirmed")
      return { status: "error", email, message: "Þú átt eftir að staðfesta netfangið. Opnaðu hlekkinn sem við sendum þér." };
    return { status: "error", email, message: authError(error, "Ekki tókst að skrá inn. Reyndu aftur.") };
  }
  redirect(next);
}

export async function signUpWithPassword(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));
  const captchaToken = String(formData.get("captcha") ?? "") || undefined;
  if (!EMAIL_RE.test(email)) return { status: "error", email, message: "Sláðu inn gilt netfang." };

  const supabase = await createClient();
  const origin = await siteOrigin();
  const {
    data: { user: current },
  } = await supabase.auth.getUser();

  // Gestur: netfangið tengt við núverandi aðgang svo auglýsingar og spjall haldist.
  // Lykilorðið er valið eftir staðfestingu (Supabase leyfir það ekki fyrr).
  if (current?.is_anonymous) {
    const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: confirmUrl(origin, "/nytt-lykilord?nyr=1") });
    if (error) {
      const taken = error.code === "email_exists" || /already/i.test(error.message);
      return { status: "error", email, message: taken ? "Þetta netfang er þegar skráð. Skráðu þig inn í staðinn." : authError(error, "Ekki tókst að búa til aðgang. Reyndu aftur.") };
    }
    return { status: "sent", email };
  }

  if (password.length < MIN_PASSWORD)
    return { status: "error", email, message: `Lykilorðið þarf að vera að minnsta kosti ${MIN_PASSWORD} stafir.` };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: confirmUrl(origin, next), captchaToken },
  });
  if (error) {
    if (error.code === "user_already_exists" || error.code === "email_exists")
      return { status: "error", email, message: "Þetta netfang er þegar skráð. Skráðu þig inn í staðinn." };
    return { status: "error", email, message: authError(error, "Ekki tókst að búa til aðgang. Reyndu aftur.") };
  }
  // Til staðar en óstaðfest/staðfest netfang: Supabase skilar notanda án auðkenna
  if (data.user && data.user.identities?.length === 0)
    return { status: "error", email, message: "Þetta netfang er þegar skráð. Skráðu þig inn í staðinn." };
  // Ef staðfesting netfangs er slökkt er notandinn strax innskráður
  if (data.session) redirect(next);
  return { status: "sent", email };
}

export async function requestPasswordReset(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const captchaToken = String(formData.get("captcha") ?? "") || undefined;
  if (!EMAIL_RE.test(email)) return { status: "error", email, message: "Sláðu inn gilt netfang." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: confirmUrl(await siteOrigin(), "/nytt-lykilord"),
    captchaToken,
  });
  // Sama svar hvort sem netfangið er til eða ekki, nema við tæknivillur
  if (error && (error.status === 429 || /captcha/i.test(error.message)))
    return { status: "error", email, message: authError(error, "Ekki tókst að senda hlekk. Reyndu aftur.") };
  return { status: "sent", email };
}

export async function setNewPassword(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < MIN_PASSWORD)
    return { status: "error", message: `Lykilorðið þarf að vera að minnsta kosti ${MIN_PASSWORD} stafir.` };
  if (password !== confirm) return { status: "error", message: "Lykilorðin eru ekki eins." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") return { status: "error", message: "Nýja lykilorðið má ekki vera það sama og það gamla." };
    if (error.code === "reauthentication_needed" || error.status === 401)
      return { status: "error", message: "Lotan er útrunnin. Biddu um nýjan hlekk undir „Gleymdirðu lykilorðinu?“." };
    return { status: "error", message: authError(error, "Ekki tókst að vista lykilorðið. Reyndu aftur.") };
  }
  redirect("/profill?lykilord=1");
}
