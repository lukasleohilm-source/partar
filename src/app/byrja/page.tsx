import { redirect } from "next/navigation";
import { safeNext } from "@/lib/safe-next";
import { getUser } from "@/lib/supabase/server";
import { GuestStart } from "./guest-start";

export const metadata = { title: "Augnablik – Partar" };

// Gestir fara hingað áður en þeir selja, spjalla eða skrá ósk: CAPTCHA og nafnlaus notandi
export default async function StartPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getUser()) redirect(next);
  return <GuestStart next={next} />;
}
