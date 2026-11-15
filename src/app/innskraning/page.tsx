import Link from "next/link";
import { UserCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-ui";
import { FacebookButton, GoogleButton, OrDivider } from "@/components/oauth-buttons";
import { getUser } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";
import { LoginForm } from "./login-form";
import { MergePrompt } from "./merge-prompt";
import { getT } from "@/lib/lang-server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: `${t("Innskráning")} – Partar` };
}

const ERRORS: Record<string, string> = {
  hlekkur: "Hlekkurinn er útrunninn eða þegar notaður. Biddu um nýjan.",
  haett_vid: "Hætt var við innskráninguna.",
  netfang: "Facebook gaf ekki upp netfang. Notaðu Google eða netfang í staðinn.",
  google: "Ekki tókst að skrá inn. Reyndu aftur.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; villa?: string; krafa?: string }>;
}) {
  const { t } = await getT();
  const { next: rawNext, villa, krafa } = await searchParams;
  const next = safeNext(rawNext);

  const user = await getUser();
  if (user && !user.is_anonymous) redirect(next);
  const signupHref = `/nyskraning${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`;

  return (
    <AuthShell
      tab="login"
      next={next}
      title={t("Velkomin(n) aftur")}
      subtitle={t("Skráðu þig inn á aðganginn þinn.")}
      footer={
        <>
          {t("Ertu ekki með aðgang?")}{" "}
          <Link href={signupHref} className="font-semibold text-orange-700 hover:underline">
            {t("Nýskráning")}
          </Link>
        </>
      }
    >
      {krafa && (
        <div role="status" className="mb-5 flex gap-3 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 text-sm">
          <UserCheck size={20} className="mt-0.5 shrink-0 text-orange-500" />
          <div>
            <p className="font-semibold text-stone-900">{t("Þú þarft aðgang til að setja inn auglýsingu eða ósk")}</p>
            <p className="mt-0.5 text-stone-600">{t("Skráðu þig inn, eða búðu til aðgang á innan við mínútu.")}</p>
          </div>
        </div>
      )}

      <MergePrompt
        next={next}
        forced={villa === "google_til"}
        isGuest={Boolean(user?.is_anonymous)}
        errorText={villa && ERRORS[villa] ? t(ERRORS[villa]) : undefined}
      />

      <div className="space-y-2.5">
        <GoogleButton next={next} />
        <FacebookButton next={next} />
      </div>
      {user?.is_anonymous && (
        <p className="mt-2 text-center text-xs text-stone-500">{t("Auglýsingar og skilaboð sem þú átt sem gestur haldast.")}</p>
      )}

      <OrDivider />

      <LoginForm next={next} />
    </AuthShell>
  );
}
