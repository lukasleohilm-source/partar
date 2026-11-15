"use client";

import { AuthForm, EmailField, SentNotice } from "@/components/auth/auth-ui";
import { useT } from "@/components/lang-provider";
import { requestPasswordReset } from "@/app/innskraning/actions";

export function ForgotForm() {
  const { t } = useT();
  return (
    <AuthForm
      action={requestPasswordReset}
      captcha
      submitLabel={t("Senda hlekk")}
      pendingLabel={t("Sendi…")}
      fields={(s) => <EmailField defaultValue={s.email} />}
      sent={(email) => (
        <SentNotice title={t("Athugaðu tölvupóstinn")}>
          {t("Ef aðgangur er til fyrir")} <strong className="break-all text-stone-900">{email}</strong>{" "}
          {t("færðu hlekk til að velja nýtt lykilorð.")}
        </SentNotice>
      )}
    />
  );
}
