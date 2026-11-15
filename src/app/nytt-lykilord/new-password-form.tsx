"use client";

import { AuthForm, MIN_PASSWORD, PasswordField } from "@/components/auth/auth-ui";
import { useT } from "@/components/lang-provider";
import { setNewPassword } from "@/app/innskraning/actions";

export function NewPasswordForm({ email }: { email: string }) {
  const { t } = useT();
  return (
    <AuthForm
      action={setNewPassword}
      submitLabel={t("Vista lykilorð")}
      pendingLabel={t("Vista…")}
      fields={() => (
        <>
          {/* Fyrir lykilorðastjóra vafrans */}
          <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
          <PasswordField label={t("Nýtt lykilorð")} autoComplete="new-password" hint={t("Að minnsta kosti {n} stafir.", { n: MIN_PASSWORD })} />
          <PasswordField name="confirm" label={t("Endurtaktu lykilorðið")} autoComplete="new-password" />
        </>
      )}
    />
  );
}
