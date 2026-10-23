import { safeNext } from "@/lib/safe-next";
import { MergeRunner } from "./merge-runner";

export const metadata = { title: "Flyt gögn – Partar", robots: { index: false } };

// Eftir innskráningu á aðgang sem var þegar til: flytur gögn gestaaðgangsins yfir
export default async function MergePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <MergeRunner next={safeNext((await searchParams).next)} />;
}
