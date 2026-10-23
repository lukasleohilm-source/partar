import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LegalLinks } from "@/components/legal-links";
import { PushToggle } from "@/components/push-toggle";
import { DeleteAccount } from "./delete-account";
import { ProfileForm } from "./profile-form";
import { SaveAccount } from "./save-account";
import { logout } from "./actions";

export const metadata = { title: "Prófíll – Partar" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ vistad?: string }> }) {
  const { vistad } = await searchParams;
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
      <h1 className="text-2xl font-bold">Prófíll</h1>
      <p className="mb-4 break-all text-sm text-stone-500">
        {user.email || (user.new_email ? `Bíður staðfestingar: ${user.new_email}` : "Gestur")}
      </p>

      {vistad && !user.is_anonymous && (
        <p role="status" className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-800">
          Aðgangurinn er vistaður. Þú getur nú skráð þig inn með netfanginu á hvaða tæki sem er.
        </p>
      )}
      {user.is_anonymous && <SaveAccount />}

      <div className="mb-4">
        <PushToggle />
      </div>

      <Link
        href="/minar-auglysingar"
        className="mb-6 flex items-center justify-between rounded-2xl bg-surface p-4 font-medium active:bg-stone-50"
      >
        <span>📦 Mínar auglýsingar</span>
        <span className="text-stone-400" aria-hidden>
          ›
        </span>
      </Link>

      <ProfileForm
        displayName={profile?.display_name ?? ""}
        region={profile?.region ?? null}
        phone={contact?.phone ?? null}
        showPhone={contact?.show_phone ?? false}
      />

      {/* Nafnlaus notandi myndi tapa auglýsingum sínum við útskráningu */}
      {!user.is_anonymous && (
        <form action={logout} className="mt-8">
          <button type="submit" className="w-full rounded-xl border border-stone-300 py-3 font-medium text-stone-700">
            Skrá út
          </button>
        </form>
      )}

      <DeleteAccount />
      <LegalLinks />
    </div>
  );
}
