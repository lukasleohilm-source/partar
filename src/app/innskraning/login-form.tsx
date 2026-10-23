"use client";

import { EmailForm } from "@/components/email-form";
import { sendMagicLink } from "./actions";

export function LoginForm({ next }: { next: string }) {
  return (
    <EmailForm
      action={sendMagicLink}
      captcha
      hidden={{ next }}
      submitLabel="Senda innskráningarhlekk"
      sentText={(email) => (
        <>
          Við sendum innskráningarhlekk á <strong className="break-all">{email}</strong>. Opnaðu hann í þessu tæki til að
          halda áfram.
        </>
      )}
    />
  );
}
