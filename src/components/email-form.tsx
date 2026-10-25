"use client";

import { MailCheck } from "lucide-react";
import { useActionState, useCallback, useEffect, useState } from "react";
import { TURNSTILE_SITE_KEY, Turnstile } from "@/components/turnstile";
import { inputClass, primaryButton } from "@/components/ui/styles";
import type { LoginState } from "@/app/innskraning/actions";
import { useT } from "@/components/lang-provider";

type Props = {
  action: (prev: LoginState, formData: FormData) => Promise<LoginState>;
  submitLabel: string;
  sentText: (email: string) => React.ReactNode;
  hidden?: Record<string, string>;
  captcha?: boolean;
  footer?: React.ReactNode;
};

// Netfangsform fyrir töfrahlekk og tengingu netfangs, með CAPTCHA ef lykill er stilltur
export function EmailForm({ action, submitLabel, sentText, hidden, captcha, footer }: Props) {
  const { t } = useT();
  const [state, formAction, pending] = useActionState<LoginState, FormData>(action, { status: "idle" });
  const needsCaptcha = Boolean(captcha && TURNSTILE_SITE_KEY);
  const [token, setToken] = useState("");
  const [captchaKey, setCaptchaKey] = useState(0);
  const onToken = useCallback((t: string) => setToken(t), []);
  const onError = useCallback(() => setToken(""), []);

  // CAPTCHA-tákn gildir einu sinni; nýtt eftir villu
  useEffect(() => {
    if (state.status === "error" && needsCaptcha) {
      setToken("");
      setCaptchaKey((k) => k + 1);
    }
  }, [state, needsCaptcha]);

  if (state.status === "sent") {
    return (
      <div className="rounded-2xl bg-surface p-6 text-center shadow-sm">
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600" aria-hidden>
          <MailCheck size={28} />
        </div>
        <h2 className="text-lg font-semibold">{t("Athugaðu tölvupóstinn")}</h2>
        <p className="mt-2 text-stone-600">{sentText(state.email ?? "")}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4 rounded-2xl bg-surface p-5 shadow-sm">
      {Object.entries(hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <input type="hidden" name="captcha" value={token} />
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">{t("Netfang")}</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          inputMode="email"
          defaultValue={state.email}
          placeholder={t("nafn@dæmi.is")}
          className={inputClass}
        />
      </label>
      {needsCaptcha && <Turnstile key={captchaKey} onToken={onToken} onError={onError} />}
      {state.status === "error" && (
        <p role="alert" className="text-sm text-red-600">
          {t(state.message ?? "")}
        </p>
      )}
      <button type="submit" disabled={pending || (needsCaptcha && !token)} className={primaryButton}>
        {pending ? t("Sendi…") : submitLabel}
      </button>
      {footer}
    </form>
  );
}
