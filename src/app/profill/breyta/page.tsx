import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "../profile-form";
import { SubpageHeader } from "../ui";

export const metadata = { title: "Prófíll og sími – Partar" };

export default async function EditProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: profile }, { data: contact }] = await Promise.all([
    supabase.from("profiles").select("display_name, region").eq("id", user.id).single(),
    supabase.from("profile_contacts").select("phone, show_phone").eq("id", user.id).single(),
  ]);

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <SubpageHeader title="Prófíll og sími" />
      <div className="rounded-2xl bg-surface p-4">
        <ProfileForm
          displayName={profile?.display_name ?? ""}
          region={profile?.region ?? null}
          phone={contact?.phone ?? null}
          showPhone={contact?.show_phone ?? false}
        />
      </div>
      <p className="mt-3 px-1 text-sm text-stone-500">Nafnið og landshlutinn sjást á auglýsingum þínum og í skilaboðum.</p>
    </div>
  );
}
