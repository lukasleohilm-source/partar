import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { GoogleButton, OrDivider } from "@/components/oauth-buttons";
import { getUser } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";
import { LoginForm } from "./login-form";
import { MergePrompt } from "./merge-prompt";

export const metadata = { title: "Innskráning – Partar" };

const ERRORS: Record<string, string> = {
  hlekkur: "Hlekkurinn er útrunninn eða þegar notaður. Biddu um nýjan.",
  haett_vid: "Hætt var við innskráningu hjá Google.",
  google: "Ekki tókst að skrá inn með Google. Reyndu aftur.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; villa?: string }>;
}) {
  const { next: rawNext, villa } = await searchParams;
  const next = safeNext(rawNext);

  const user = await getUser();
  if (user && !user.is_anonymous) redirect(next);

  return (
    <div className="mx-auto max-w-md px-4 pt-8">
      <Logo className="mb-6" />
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight">Skráðu þig inn</h1>
      <p className="mb-6 text-stone-600">Ekkert lykilorð. Nýir notendur eru skráðir sjálfkrafa.</p>

      <MergePrompt
        next={next}
        forced={villa === "google_til"}
        isGuest={Boolean(user?.is_anonymous)}
        errorText={villa ? ERRORS[villa] : undefined}
      />

      <GoogleButton next={next} />
      {user?.is_anonymous && (
        <p className="mt-2 text-center text-xs text-stone-500">Auglýsingar og skilaboð sem þú átt sem gestur haldast.</p>
      )}

      <OrDivider />

      <LoginForm next={next} />

      {user?.is_anonymous && (
        <p className="mt-4 text-center text-sm text-stone-500">
          Viltu frekar tengja netfang við gestaaðganginn?{" "}
          <Link href="/profill" className="font-semibold text-orange-700">
            Fara í „Ég“
          </Link>
        </p>
      )}
    </div>
  );
}
