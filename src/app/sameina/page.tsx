import { safeNext } from "@/lib/safe-next";
import { MergeRunner } from "./merge-runner";
import { getT } from "@/lib/lang-server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: `${t("Flyt gögn")} – Partar`, robots: { index: false } };
}

// Eftir innskráningu á aðgang sem var þegar til: flytur gögn gestaaðgangsins yfir
export default async function MergePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <MergeRunner next={safeNext((await searchParams).next)} />;
}
