"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthForm, EmailField, PasswordField, SentNotice } from "@/components/auth/auth-ui";
import { useT } from "@/components/lang-provider";
import { sendMagicLink, signInWithPassword } from "./actions";

// Innskráning með netfangi og lykilorði; hlekkur í tölvupósti fyrir þá sem vilja ekki lykilorð
export function LoginForm({ next }: { next: string }) {
  const { t } = useT();
  const [magic, setMagic] = useState(false);
  const forgot = `/gleymt-lykilord${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`;

  if (magic) {
    return (
      <AuthForm
        key="magic"
        action={sendMagicLink}
        captcha
        hidden={{ next }}
        submitLabel={t("Senda innskráningarhlekk")}
        pendingLabel={t("Sendi…")}
        fields={(s) => <EmailField defaultValue={s.email} />}
        sent={(email) => (
          <SentNotice title={t("Athugaðu tölvupóstinn")}>
            {t("Við sendum innskráningarhlekk á")} <strong className="break-all text-stone-900">{email}</strong>
            {t(". Opnaðu hann í þessu tæki til að halda áfram.")}
          </SentNotice>
        )}
        after={
          <button type="button" onClick={() => setMagic(false)} className="w-full text-center text-sm font-semibold text-orange-700 hover:underline">
            {t("Skrá inn með lykilorði")}
          </button>
        }
      />
    );
  }

  return (
    <AuthForm
      key="password"
      action={signInWithPassword}
      captcha
      hidden={{ next }}
      submitLabel={t("Skrá inn")}
      pendingLabel={t("Skrái inn…")}
      fields={(s) => (
        <>
          <EmailField defaultValue={s.email} />
          <PasswordField
            label={t("Lykilorð")}
            autoComplete="current-password"
            aside={
              <Link href={forgot} className="text-sm font-medium text-orange-700 hover:underline">
                {t("Gleymdirðu lykilorðinu?")}
              </Link>
            }
          />
        </>
      )}
      after={
        <button type="button" onClick={() => setMagic(true)} className="w-full text-center text-sm font-medium text-stone-600 hover:text-stone-900">
          {t("Ekkert lykilorð? Fáðu innskráningarhlekk í tölvupósti")}
        </button>
      }
    />
  );
}
