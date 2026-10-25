"use client";

import { EmailForm } from "@/components/email-form";
import { sendMagicLink } from "./actions";
import { useT } from "@/components/lang-provider";

export function LoginForm({ next }: { next: string }) {
  const { t } = useT();
  return (
    <EmailForm
      action={sendMagicLink}
      captcha
      hidden={{ next }}
      submitLabel={t("Senda innskráningarhlekk")}
      sentText={(email) => (
        <>
          {t("Við sendum innskráningarhlekk á")}{" "}<strong className="break-all">{email}</strong>{t(". Opnaðu hann í þessu tæki til að halda áfram.")}
        </>
      )}
    />
  );
}
