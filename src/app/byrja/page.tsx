import { redirect } from "next/navigation";
import { safeNext } from "@/lib/safe-next";
import { getUser } from "@/lib/supabase/server";
import { GuestStart } from "./guest-start";
import { getT } from "@/lib/lang-server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: `${t("Augnablik")} – Partar` };
}

// Gestir fara hingað áður en þeir selja, spjalla eða skrá ósk: CAPTCHA og nafnlaus notandi
export default async function StartPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getUser()) redirect(next);
  return <GuestStart next={next} />;
}
