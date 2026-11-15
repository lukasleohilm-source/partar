import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-ui";
import { getT } from "@/lib/lang-server";
import { getUser } from "@/lib/supabase/server";
import { NewPasswordForm } from "./new-password-form";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: `${t("Nýtt lykilorð")} – Partar` };
}

// Hlekkur úr „Gleymt lykilorð“-pósti endar hér (innskráður); innskráðir geta líka sett eða breytt lykilorði
export default async function NewPasswordPage({ searchParams }: { searchParams: Promise<{ nyr?: string }> }) {
  const { t } = await getT();
  const { nyr } = await searchParams;
  const user = await getUser();
  if (!user || user.is_anonymous || !user.email) redirect("/gleymt-lykilord");

  return (
    <AuthShell
      title={nyr ? t("Veldu lykilorð") : t("Nýtt lykilorð")}
      subtitle={
        nyr
          ? t("Netfangið er staðfest. Veldu lykilorð til að skrá þig inn næst.")
          : t("Veldu nýtt lykilorð fyrir {netfang}.", { netfang: user.email })
      }
    >
      <NewPasswordForm email={user.email} />
    </AuthShell>
  );
}
