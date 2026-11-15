"use client";

import { Eye, EyeOff, MailCheck } from "lucide-react";
import Link from "next/link";
import { useActionState, useCallback, useEffect, useState } from "react";
import type { LoginState } from "@/app/innskraning/actions";
import { useT } from "@/components/lang-provider";
import { Logo } from "@/components/logo";
import { TURNSTILE_SITE_KEY, Turnstile } from "@/components/turnstile";
import { inputClass, primaryButton } from "@/components/ui/styles";

export const MIN_PASSWORD = 8;

/** Rammi fyrir innskráningarsíður: merki, flipar Innskráning/Nýskráning, titill og texti */
export function AuthShell({
  tab,
  next,
  title,
  subtitle,
  children,
  footer,
}: {
  tab?: "login" | "signup";
  next?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { t } = useT();
  const q = next && next !== "/" ? `?next=${encodeURIComponent(next)}` : "";
  const tabClass = (on: boolean) =>
    `flex-1 rounded-lg py-2 text-center text-sm font-semibold transition-colors ${
      on ? "bg-surface text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
    }`;
  return (
    <div className="mx-auto w-full max-w-[420px] px-4 pb-12 pt-8 md:pt-14">
      <Link href="/" className="mb-8 flex justify-center" aria-label={t("Partar forsíða")}>
        <Logo />
      </Link>
      <div className="rounded-3xl bg-surface p-6 shadow-sm ring-1 ring-line md:p-8">
        {tab && (
          <nav aria-label={t("Aðgangur")} className="mb-6 flex gap-1 rounded-xl bg-surface-2 p-1">
            <Link href={`/innskraning${q}`} aria-current={tab === "login" ? "page" : undefined} className={tabClass(tab === "login")}>
              {t("Innskráning")}
            </Link>
            <Link href={`/nyskraning${q}`} aria-current={tab === "signup" ? "page" : undefined} className={tabClass(tab === "signup")}>
              {t("Nýskráning")}
            </Link>
          </nav>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">{title}</h1>
        {subtitle && <p className="mt-1 text-stone-600">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-6 text-center text-sm text-stone-600">{footer}</div>}
    </div>
  );
}

/** Reitur fyrir netfang */
export function EmailField({ defaultValue }: { defaultValue?: string }) {
  const { t } = useT();
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-stone-700">{t("Netfang")}</span>
      <input
        type="email"
        name="email"
        required
        autoComplete="email"
        inputMode="email"
        defaultValue={defaultValue}
        placeholder={t("nafn@dæmi.is")}
        className={inputClass}
      />
    </label>
  );
}

/** Lykilorðsreitur með auga til að sýna/fela */
export function PasswordField({
  name = "password",
  label,
  autoComplete,
  hint,
  aside,
}: {
  name?: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  hint?: string;
  aside?: React.ReactNode;
}) {
  const { t } = useT();
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-stone-700">{label}</span>
        {aside}
      </span>
      <span className="relative block">
        <input
          type={show ? "text" : "password"}
          name={name}
          required
          autoComplete={autoComplete}
          minLength={autoComplete === "new-password" ? MIN_PASSWORD : undefined}
          className={`${inputClass} pr-12`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? t("Fela lykilorð") : t("Sýna lykilorð")}
          aria-pressed={show}
          className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-stone-500 hover:text-stone-800"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
      {hint && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}
    </label>
  );
}

/** „Athugaðu tölvupóstinn“ */
export function SentNotice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div role="status" className="text-center">
      <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-orange-600/12 text-orange-600" aria-hidden>
        <MailCheck size={28} />
      </div>
      <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
      <p className="mt-2 text-stone-600">{children}</p>
    </div>
  );
}

/**
 * Form með server action, CAPTCHA (ef þörf) og villuskilaboðum.
 * `fields` fær síðasta stöðu svo netfangið haldist eftir villu.
 */
export function AuthForm({
  action,
  hidden,
  captcha = false,
  submitLabel,
  pendingLabel,
  fields,
  sent,
  after,
}: {
  action: (prev: LoginState, formData: FormData) => Promise<LoginState>;
  hidden?: Record<string, string>;
  captcha?: boolean;
  submitLabel: string;
  pendingLabel: string;
  fields: (state: LoginState) => React.ReactNode;
  sent?: (email: string) => React.ReactNode;
  after?: React.ReactNode;
}) {
  const { t } = useT();
  const [state, formAction, pending] = useActionState<LoginState, FormData>(action, { status: "idle" });
  const needsCaptcha = Boolean(captcha && TURNSTILE_SITE_KEY);
  const [token, setToken] = useState("");
  const [captchaKey, setCaptchaKey] = useState(0);
  const onToken = useCallback((v: string) => setToken(v), []);
  const onError = useCallback(() => setToken(""), []);

  // CAPTCHA-tákn gildir einu sinni; nýtt eftir villu
  useEffect(() => {
    if (state.status === "error" && needsCaptcha) {
      setToken("");
      setCaptchaKey((k) => k + 1);
    }
  }, [state, needsCaptcha]);

  if (state.status === "sent" && sent) return <>{sent(state.email ?? "")}</>;

  return (
    <form action={formAction} className="space-y-4">
      {Object.entries(hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <input type="hidden" name="captcha" value={token} />
      {fields(state)}
      {needsCaptcha && <Turnstile key={captchaKey} onToken={onToken} onError={onError} />}
      {state.status === "error" && (
        <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600">
          {t(state.message ?? "")}
        </p>
      )}
      <button type="submit" disabled={pending || (needsCaptcha && !token)} className={primaryButton}>
        {pending ? pendingLabel : submitLabel}
      </button>
      {after}
    </form>
  );
}
