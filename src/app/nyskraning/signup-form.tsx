"use client";

import Link from "next/link";
import { AuthForm, EmailField, MIN_PASSWORD, PasswordField, SentNotice } from "@/components/auth/auth-ui";
import { useT } from "@/components/lang-provider";
import { signUpWithPassword } from "@/app/innskraning/actions";

export function SignupForm({ next, isGuest }: { next: string; isGuest: boolean }) {
  const { t } = useT();
  return (
    <AuthForm
      action={signUpWithPassword}
      captcha={!isGuest}
      hidden={{ next }}
      submitLabel={t("Búa til aðgang")}
      pendingLabel={t("Bý til aðgang…")}
      fields={(s) => (
        <>
          <EmailField defaultValue={s.email} />
          {/* Gestur velur lykilorð eftir að netfangið er staðfest */}
          {!isGuest && (
            <PasswordField
              label={t("Lykilorð")}
              autoComplete="new-password"
              hint={t("Að minnsta kosti {n} stafir.", { n: MIN_PASSWORD })}
            />
          )}
        </>
      )}
      sent={(email) => (
        <SentNotice title={t("Staðfestu netfangið")}>
          {t("Við sendum hlekk á")} <strong className="break-all text-stone-900">{email}</strong>
          {isGuest
            ? t(". Opnaðu hann til að staðfesta netfangið og velja lykilorð.")
            : t(". Opnaðu hann til að virkja aðganginn. Athugaðu ruslpóstinn ef hann berst ekki.")}
        </SentNotice>
      )}
      after={
        <p className="text-center text-xs leading-relaxed text-stone-500">
          {t("Með því að búa til aðgang samþykkir þú")}{" "}
          <Link href="/skilmalar" className="underline">
            {t("skilmála")}
          </Link>{" "}
          {t("og")}{" "}
          <Link href="/personuvernd" className="underline">
            {t("persónuverndarstefnu")}
          </Link>
          .
        </p>
      }
    />
  );
}
