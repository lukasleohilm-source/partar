import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";
import { logout } from "./actions";

export const metadata = { title: "Prófíll – Partar" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/innskraning?next=/profill");

  const [{ data: profile }, { data: contact }] = await Promise.all([
    supabase.from("profiles").select("display_name, region").eq("id", user.id).single(),
    supabase.from("profile_contacts").select("phone, show_phone").eq("id", user.id).single(),
  ]);

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <h1 className="text-2xl font-bold">Prófíll</h1>
      <p className="mb-6 break-all text-sm text-stone-500">{user.email}</p>

      <ProfileForm
        displayName={profile?.display_name ?? ""}
        region={profile?.region ?? null}
        phone={contact?.phone ?? null}
        showPhone={contact?.show_phone ?? false}
      />

      <form action={logout} className="mt-8">
        <button type="submit" className="w-full rounded-xl border border-stone-300 py-3 font-medium text-stone-700">
          Skrá út
        </button>
      </form>
    </div>
  );
}
