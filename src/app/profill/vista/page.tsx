import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SaveAccount } from "../save-account";
import { SubpageHeader } from "../ui";

export const metadata = { title: "Vista aðgang – Partar" };

export default async function SaveAccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  if (!user.is_anonymous && user.email) redirect("/profill");

  return (
    <div className="mx-auto max-w-md md:max-w-xl md:pt-10 px-4 pt-6">
      <SubpageHeader title="Vista aðgang" />
      <SaveAccount />
    </div>
  );
}
