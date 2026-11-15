import { Guides } from "@/components/guide/guides";
import { getT } from "@/lib/lang-server";

export async function generateMetadata() {
  const { t } = await getT();
  return {
    title: `${t("Leiðbeiningar")} – Partar`,
    description: t("Svona selur þú hlut, óskar eftir hlut og finnur rétta varahlutinn á Partar."),
  };
}

export default function GuidesPage() {
  return <Guides />;
}
