"use client";

import { Mail, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/logo";
import { FacebookButton, GoogleButton } from "@/components/oauth-buttons";
import { createClient } from "@/lib/supabase/client";

const SEEN_KEY = "partar_velkomin";
// Síður þar sem glugginn á ekki við
const SKIP = [/^\/innskraning/, /^\/byrja/, /^\/auth/, /^\/sameina/, /^\/skilmalar/, /^\/personuvernd/, /^\/gagnaeyding/];

// Velkomugluggi við fyrstu heimsókn: skrá inn með Google, netfangi eða skoða sem gestur.
// Birtist aðeins einu sinni og aldrei hjá þeim sem eru þegar með lotu (notendur eða gestir).
export function WelcomeGate() {
  const pathname = usePathname();
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (SKIP.some((r) => r.test(pathname))) return;
    let seen = false;
    try {
      seen = localStorage.getItem(SEEN_KEY) === "1";
    } catch {
      seen = true; // engin geymsla (t.d. huliðsgluggi í sumum vöfrum): ekki trufla
    }
    if (seen) return;
    createClient()
      .auth.getSession()
      .then(({ data: { session } }) => {
        if (!session) setOpen(true);
        else close();
      });
  }, [pathname]);

  useEffect(() => {
    const d = ref.current;
    if (open && d && !d.open) d.showModal();
  }, [open]);

  function close() {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {}
    ref.current?.close();
    setOpen(false);
  }

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      onClose={close}
      aria-labelledby="velkomin-titill"
      className="m-auto w-[min(92vw,400px)] rounded-3xl bg-surface p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="px-6 pb-6 pt-7 text-center">
        <Logo className="justify-center" />
        <h2 id="velkomin-titill" className="mt-5 text-[22px] font-extrabold leading-tight tracking-tight text-stone-900">
          Velkomin(n) á Partar
        </h2>
        <p className="mt-2 text-stone-600">Notaðir varahlutir, partabílar og ódýrir bílar, beint frá fólki.</p>

        <div className="mt-6 space-y-2.5 text-left">
          <GoogleButton next={pathname} />
          <FacebookButton next={pathname} />
          <Link
            href={`/innskraning?next=${encodeURIComponent(pathname)}`}
            onClick={close}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-stone-300 bg-surface py-3 text-base font-semibold text-stone-800 shadow-sm active:scale-[0.98]"
          >
            <Mail size={20} className="text-stone-500" /> Skrá inn með netfangi
          </Link>
          <button
            type="button"
            onClick={close}
            className="flex w-full items-center justify-center gap-3 rounded-xl py-3 text-base font-semibold text-orange-700 active:bg-orange-50"
          >
            <UserRound size={20} /> Skoða sem gestur
          </button>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-stone-500">
          Gestir geta skoðað, leitað og selt. Þú getur alltaf vistað aðganginn síðar.
          <br />
          Með því að halda áfram samþykkir þú{" "}
          <Link href="/skilmalar" onClick={close} className="underline">
            skilmála
          </Link>{" "}
          og{" "}
          <Link href="/personuvernd" onClick={close} className="underline">
            persónuvernd
          </Link>
          .
        </p>
      </div>
    </dialog>
  );
}
