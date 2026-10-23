"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { TURNSTILE_SITE_KEY, Turnstile } from "@/components/turnstile";
import { createClient } from "@/lib/supabase/client";

export function GuestStart({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState(false);
  const started = useRef(false);

  const signIn = useCallback(
    async (captchaToken?: string) => {
      if (started.current) return;
      started.current = true;
      const { error } = await createClient().auth.signInAnonymously(captchaToken ? { options: { captchaToken } } : undefined);
      if (error) {
        started.current = false;
        return setError(true);
      }
      router.replace(next);
      router.refresh();
    },
    [next, router],
  );
  const onError = useCallback(() => setError(true), []);

  // Án Turnstile-lykils (þróun) er skráð inn beint
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) signIn();
  }, [signIn]);

  return (
    <div className="mx-auto max-w-md px-4 pt-16 text-center">
      <h1 className="text-xl font-bold">Augnablik…</h1>
      <p className="mt-2 text-stone-600">Við athugum að þú sért ekki vélmenni.</p>
      <div className="my-6 min-h-16">{TURNSTILE_SITE_KEY && <Turnstile onToken={signIn} onError={onError} />}</div>
      {error && (
        <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          Það tókst ekki. Athugaðu nettenginguna og{" "}
          <button type="button" onClick={() => window.location.reload()} className="font-semibold underline">
            reyndu aftur
          </button>
          .
        </div>
      )}
      <Link href={`/innskraning?next=${encodeURIComponent(next)}`} className="mt-8 inline-block text-sm font-medium text-orange-700">
        Ertu með aðgang? Skráðu þig inn með netfangi
      </Link>
    </div>
  );
}
