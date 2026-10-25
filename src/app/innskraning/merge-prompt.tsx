"use client";

import { useEffect, useState } from "react";
import { FacebookButton, GoogleButton } from "@/components/oauth-buttons";
import { useT } from "@/components/lang-provider";

// Birtist þegar Google- eða Facebook-aðgangurinn (eða netfang hans) er þegar skráður á Pörtum.
// Supabase setur villukóðann í hash-hluta slóðarinnar, sem þjónninn sér ekki, svo hann er lesinn hér.
export function MergePrompt({
  next,
  forced,
  isGuest,
  errorText,
}: {
  next: string;
  forced: boolean;
  isGuest: boolean;
  errorText?: string;
}) {
  const { t } = useT();
  const [show, setShow] = useState(forced);

  useEffect(() => {
    const code = new URLSearchParams(window.location.hash.slice(1)).get("error_code");
    if (code === "email_exists" || code === "identity_already_exists") setShow(true);
  }, []);

  if (!show) {
    return errorText ? (
      <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
        {errorText}
      </p>
    ) : null;
  }
  return (
    <div role="alert" className="mb-5 space-y-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
      <p>
        <strong>{t("Þú átt þegar aðgang á Pörtum með þessum aðgangi eða netfangi.")}</strong>{" "}
        {isGuest
          ? t("Skráðu þig inn á hann, og við flytjum auglýsingar, skilaboð og óskir gestaaðgangsins yfir.")
          : t("Skráðu þig inn á hann með sömu leið og áður.")}
      </p>
      <GoogleButton next={next} mode={isGuest ? "merge" : "signin"} label={isGuest ? t("Skrá inn með Google og flytja gögnin") : t("Skrá inn með Google")} />
      <FacebookButton next={next} mode={isGuest ? "merge" : "signin"} label={isGuest ? t("Skrá inn með Facebook og flytja gögnin") : t("Skrá inn með Facebook")} />
    </div>
  );
}
