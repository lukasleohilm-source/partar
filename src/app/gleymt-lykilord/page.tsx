import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-ui";
import { getT } from "@/lib/lang-server";
import { safeNext } from "@/lib/safe-next";
import { ForgotForm } from "./forgot-form";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: `${t("Gleymt lykilorð")} – Partar` };
}

export default async function ForgotPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { t } = await getT();
  const next = safeNext((await searchParams).next);
  return (
    <AuthShell
      title={t("Gleymdirðu lykilorðinu?")}
      subtitle={t("Sláðu inn netfangið þitt og við sendum þér hlekk til að velja nýtt lykilorð.")}
      footer={
        <Link
          href={`/innskraning${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-semibold text-orange-700 hover:underline"
        >
          ← {t("Til baka í innskráningu")}
        </Link>
      }
    >
      <ForgotForm />
    </AuthShell>
  );
}
