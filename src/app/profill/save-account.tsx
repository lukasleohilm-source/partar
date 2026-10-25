"use client";

import Link from "next/link";
import { linkEmail } from "@/app/innskraning/actions";
import { EmailForm } from "@/components/email-form";
import { FacebookButton, GoogleButton, OrDivider } from "@/components/oauth-buttons";
import { useT } from "@/components/lang-provider";

// Fyrir gesti: tengja Google eða netfang við núverandi aðgang svo auglýsingar og spjall haldist
export function SaveAccount() {
  const { t } = useT();
  return (
    <section className="mb-6">
      <div className="mb-3 rounded-2xl bg-orange-50 p-4 text-sm text-orange-900">
        <p className="font-semibold">{t("Vistaðu aðganginn þinn")}</p>
        <p className="mt-1">
          {t("Þú ert gestur. Ef þú hreinsar vafrann eða skiptir um síma tapast auglýsingar þínar og skilaboð. Tengdu Google eða netfang til að geta skráð þig inn hvar sem er.")}
        </p>
      </div>
      <div className="space-y-2.5">
        <GoogleButton next="/profill?vistad=1" label={t("Vista með Google")} />
        <FacebookButton next="/profill?vistad=1" label={t("Vista með Facebook")} />
      </div>
      <OrDivider />
      <EmailForm
        action={linkEmail}
        submitLabel={t("Tengja netfang")}
        sentText={(email) => (
          <>
            {t("Við sendum staðfestingarhlekk á")}{" "}<strong className="break-all">{email}</strong>{t(". Aðgangurinn er vistaður þegar þú smellir á hann.")}
          </>
        )}
        footer={
          <p className="text-center text-sm text-stone-500">
            {t("Ertu þegar með aðgang?")}{" "}
            <Link href="/innskraning?next=/profill" className="font-medium text-orange-700">
              {t("Skrá inn")}
            </Link>
          </p>
        }
      />
    </section>
  );
}
