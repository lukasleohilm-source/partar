"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

export type LoginState = { status: "idle" | "sent" | "error"; email?: string; message?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = safeNext(String(formData.get("next") ?? ""));

  if (!EMAIL_RE.test(email)) {
    return { status: "error", email, message: "Sláðu inn gilt netfang." };
  }

  const h = await headers();
  const origin = h.get("origin") ?? `http://${h.get("host")}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}${next}`, shouldCreateUser: true },
  });

  if (error) {
    const message =
      error.status === 429
        ? "Of margar tilraunir. Bíddu aðeins og reyndu aftur."
        : "Ekki tókst að senda hlekk. Reyndu aftur.";
    return { status: "error", email, message };
  }

  return { status: "sent", email };
}
