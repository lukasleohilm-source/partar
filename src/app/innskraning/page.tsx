import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";
import { LoginForm } from "./login-form";

export const metadata = { title: "Innskráning – Partar" };

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
    <div className="mx-auto max-w-md px-4 pt-10">
      <h1 className="mb-2 text-2xl font-bold">Skráðu þig inn</h1>
      <p className="mb-6 text-stone-600">Við sendum þér hlekk í tölvupósti til að skrá þig inn.</p>
      {user?.is_anonymous && (
        <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          Þú ert að nota Partar sem gestur. Ef þú skráir þig inn á annan aðgang fylgja auglýsingar og skilaboð gestsins
          ekki með. Viltu halda þeim?{" "}
          <Link href="/profill" className="font-semibold underline">
            Vistaðu þennan aðgang með netfangi
          </Link>
          .
        </p>
      )}
      {villa === "hlekkur" && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          Hlekkurinn er útrunninn eða þegar notaður. Biddu um nýjan.
        </p>
      )}
      <LoginForm next={next} />
    </div>
  );
}
