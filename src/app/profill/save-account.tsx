"use client";

import Link from "next/link";
import { linkEmail } from "@/app/innskraning/actions";
import { EmailForm } from "@/components/email-form";

// Fyrir gesti: tengja netfang við núverandi aðgang svo auglýsingar og spjall haldist
export function SaveAccount() {
  return (
    <section className="mb-6">
      <div className="mb-2 rounded-2xl bg-orange-50 p-4 text-sm text-orange-900">
        <p className="font-semibold">Vistaðu aðganginn þinn</p>
        <p className="mt-1">
          Þú ert gestur. Ef þú hreinsar vafrann eða skiptir um síma tapast auglýsingar þínar og skilaboð. Tengdu netfang
          til að geta skráð þig inn hvar sem er.
        </p>
      </div>
      <EmailForm
        action={linkEmail}
        submitLabel="Tengja netfang"
        sentText={(email) => (
          <>
            Við sendum staðfestingarhlekk á <strong className="break-all">{email}</strong>. Aðgangurinn er vistaður þegar þú
            smellir á hann.
          </>
        )}
        footer={
          <p className="text-center text-sm text-stone-500">
            Ertu þegar með aðgang?{" "}
            <Link href="/innskraning?next=/profill" className="font-medium text-orange-700">
              Skrá inn
            </Link>
          </p>
        }
      />
    </section>
  );
}
