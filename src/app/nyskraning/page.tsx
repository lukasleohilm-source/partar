import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-ui";
import { FacebookButton, GoogleButton, OrDivider } from "@/components/oauth-buttons";
import { getT } from "@/lib/lang-server";
import { safeNext } from "@/lib/safe-next";
import { getUser } from "@/lib/supabase/server";
import { SignupForm } from "./signup-form";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: `${t("Nýskráning")} – Partar` };
}

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { t } = await getT();
  const next = safeNext((await searchParams).next);
  const user = await getUser();
  if (user && !user.is_anonymous) redirect(next);
  const loginHref = `/innskraning${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`;

  return (
    <AuthShell
      tab="signup"
      next={next}
      title={t("Búðu til aðgang")}
      subtitle={t("Ókeypis. Seldu, óskaðu eftir hlutum og spjallaðu við seljendur.")}
      footer={
        <>
          {t("Ertu þegar með aðgang?")}{" "}
          <Link href={loginHref} className="font-semibold text-orange-700 hover:underline">
            {t("Skrá inn")}
          </Link>
        </>
      }
    >
      <div className="space-y-2.5">
        <GoogleButton next={next} />
        <FacebookButton next={next} />
      </div>
      {user?.is_anonymous && (
        <p className="mt-2 text-center text-xs text-stone-500">{t("Auglýsingar og skilaboð sem þú átt sem gestur haldast.")}</p>
      )}
      <OrDivider />
      <SignupForm next={next} isGuest={Boolean(user?.is_anonymous)} />
    </AuthShell>
  );
}
