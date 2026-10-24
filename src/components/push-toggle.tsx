"use client";

import { Bell, Mail, Share, SquarePlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { disablePush, enablePush, getPushState, isIos, type PushState } from "@/lib/push-client";
import { reportError } from "@/lib/report-error";
import { createClient } from "@/lib/supabase/client";

type PrefKey = "messages" | "wanted" | "price_drop" | "reviews" | "email";
type Prefs = Record<PrefKey, boolean>;

const PREFS: { key: PrefKey; label: string; hint: string }[] = [
  { key: "messages", label: "Skilaboð", hint: "Þegar einhver sendir þér skilaboð" },
  { key: "wanted", label: "Óskir", hint: "Þegar ný auglýsing passar við ósk þína" },
  { key: "price_drop", label: "Verðlækkun", hint: "Þegar verð lækkar á auglýsingu í uppáhaldi" },
  { key: "reviews", label: "Umsagnir", hint: "Þegar kaupandi gefur þér einkunn" },
  { key: "email", label: "Líka í tölvupósti", hint: "Ef tilkynningar í vafra eru ekki virkar" },
];
const ALL_ON: Prefs = { messages: true, wanted: true, price_drop: true, reviews: true, email: true };

const TEXT: Record<PushState, string> = {
  email: "",
  unsupported: "Þessi vafri styður ekki tilkynningar. Prófaðu Chrome á Android eða Safari á iPhone.",
  "in-app":
    "Þú ert í vafra inni í Facebook eða öðru appi og hann styður ekki tilkynningar. Ýttu á ⋯ og veldu „Opna í vafra“ (Chrome eða Safari).",
  "ios-install": "Á iPhone virka tilkynningar aðeins ef Partar er sett á heimaskjáinn:",
  "ios-old": "Tilkynningar á iPhone þurfa iOS 16.4 eða nýrra. Uppfærðu símann í Stillingar → Almennt → Hugbúnaðaruppfærsla.",
  denied: "",
  off: "Fáðu tilkynningu þegar þú færð skilaboð eða auglýsing passar við ósk.",
  on: "Kveikt. Þú færð tilkynningu um ný skilaboð og auglýsingar sem passa við óskir.",
};

function deniedText(): string {
  return isIos()
    ? "Tilkynningar eru bannaðar. Opnaðu Stillingar → Tilkynningar → Partar og kveiktu á „Leyfa tilkynningar“."
    : "Tilkynningar eru bannaðar fyrir þessa síðu. Ýttu á lásinn eða ⓘ vinstra megin við slóðina efst → Heimildir → Tilkynningar → Leyfa. Endurhlaða svo síðunni.";
}

function errorText(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.startsWith("save:")) return "Ekki tókst að vista áskriftina. Prófaðu að endurhlaða síðunni og reyna aftur.";
  if (msg.startsWith("timeout")) return "Síminn svaraði ekki í tæka tíð. Athugaðu nettenginguna og reyndu aftur.";
  return "Ekki tókst að kveikja á tilkynningum. Reyndu aftur.";
}

export function PushToggle({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    getPushState()
      .then(setState)
      .catch((e) => {
        reportError(e, "push: getPushState");
        setState("unsupported");
      });
  }, []);

  if (state === "email") return <EmailNotifications compact={compact} />;
  if (!state || (compact && (state === "on" || state === "unsupported"))) return null;

  async function toggle() {
    setBusy(true);
    setNotice(null);
    try {
      if (state === "on") {
        setState(await disablePush());
        return;
      }
      const result = await enablePush();
      if (result === "dismissed") {
        setNotice("Þú lokaðir glugganum án þess að leyfa. Ýttu aftur og veldu „Leyfa“.");
        return;
      }
      setState(result);
      if (result === "on") {
        // Staðfesting beint í símann svo notandinn sjái strax að þetta virkar
        const reg = await navigator.serviceWorker.ready;
        await reg
          .showNotification("Tilkynningar virka 🎉", { body: "Þú færð tilkynningu þegar eitthvað gerist á Partar.", icon: "/pwa-icon/192" })
          .catch(() => {});
      }
    } catch (e) {
      reportError(e, `push: toggle from ${state}`);
      setNotice(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const canToggle = state === "on" || state === "off";

  return (
    <section className="rounded-2xl bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-semibold">
            <Bell size={18} className="text-orange-600" /> Tilkynningar
          </p>
          <p className="mt-0.5 text-sm text-stone-600">{state === "denied" ? deniedText() : TEXT[state]}</p>
        </div>
        {canToggle && (
          <button
            type="button"
            role="switch"
            aria-checked={state === "on"}
            aria-label="Tilkynningar"
            disabled={busy}
            onClick={toggle}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
              state === "on" ? "bg-orange-600" : "bg-stone-300"
            }`}
          >
            <span
              className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-all ${state === "on" ? "left-[1.375rem]" : "left-0.5"}`}
            />
          </button>
        )}
      </div>
      {!compact && <NotificationPrefs pushOn={state === "on"} />}
      {state === "ios-install" && (
        <ol className="mt-3 space-y-2 text-sm text-stone-700">
          <li className="flex items-center gap-2">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">1</span>
            Ýttu á <Share size={16} className="text-blue-600" aria-label="Deila" /> Deila neðst í Safari
          </li>
          <li className="flex items-center gap-2">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">2</span>
            Veldu <SquarePlus size={16} aria-hidden /> „Setja á heimaskjá“ (Add to Home Screen)
          </li>
          <li className="flex items-center gap-2">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">3</span>
            Opnaðu Partar af heimaskjánum, skráðu þig inn og kveiktu hér
          </li>
        </ol>
      )}
      {notice && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {notice}
        </p>
      )}
    </section>
  );
}

// Hvaða tilkynningar notandinn vill fá. Engin vistuð röð = allt kveikt.
function NotificationPrefs({ pushOn, emailMode = false }: { pushOn: boolean; emailMode?: boolean }) {
  const [supabase] = useState(createClient);
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [failed, setFailed] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setEmail(user?.email || null));
    supabase
      .from("notification_prefs")
      .select("messages, wanted, price_drop, reviews, email")
      .maybeSingle()
      .then(({ data }) => setPrefs(data ?? ALL_ON));
  }, [supabase]);

  async function change(key: PrefKey, value: boolean) {
    if (!prefs) return;
    const before = prefs;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setFailed(false);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = user
      ? await supabase.from("notification_prefs").upsert({ user_id: user.id, ...next, updated_at: new Date().toISOString() })
      : { error: true };
    if (error) {
      setPrefs(before);
      setFailed(true);
    }
  }

  // Gestir án netfangs fá hvorki póst né stillingar fyrr en kveikt er á tilkynningum
  if (!prefs || (!pushOn && !email)) return null;

  // Pósturinn er eina leiðin: aðalrofinn fyrst, svo tegundirnar
  const rows = emailMode
    ? [{ key: "email" as const, label: "Senda mér tölvupóst", hint: `Á ${email}` }, ...PREFS.filter((p) => p.key !== "email")]
    : PREFS.filter((p) => p.key !== "email" || email).map((p) => (p.key === "email" ? { ...p, hint: `${p.hint} (${email})` } : p));

  return (
    <fieldset className="mt-4 border-t border-line pt-3">
      <legend className="mb-1 text-sm font-semibold text-stone-800">Láta mig vita um</legend>
      {rows.map((p) => (
        <label key={p.key} className="flex cursor-pointer items-center justify-between gap-3 py-2">
          <span>
            <span className="block text-[15px] font-medium text-stone-900">{p.label}</span>
            <span className="block break-all text-xs text-stone-500">{p.hint}</span>
          </span>
          <input
            type="checkbox"
            checked={prefs[p.key]}
            onChange={(e) => void change(p.key, e.target.checked)}
            className="size-5 shrink-0 accent-orange-600"
          />
        </label>
      ))}
      {failed && (
        <p role="alert" className="text-sm text-red-600">
          Ekki tókst að vista. Reyndu aftur.
        </p>
      )}
    </fieldset>
  );
}

// Tilkynningar koma í tölvupósti. Gestir án netfangs eru beðnir að vista aðganginn.
function EmailNotifications({ compact }: { compact: boolean }) {
  const [email, setEmail] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => setEmail(user?.email || null));
  }, []);

  if (email === undefined || (compact && email)) return null;

  return (
    <section className="rounded-2xl bg-surface p-4">
      <p className="flex items-center gap-2 font-semibold">
        <Mail size={18} className="text-orange-600" /> Tilkynningar í tölvupósti
      </p>
      {email ? (
        <>
          <p className="mt-0.5 text-sm text-stone-600">Við sendum þér póst þegar þú færð skilaboð eða eitthvað passar við óskir þínar.</p>
          <NotificationPrefs pushOn={false} emailMode />
        </>
      ) : (
        <>
          <p className="mt-0.5 text-sm text-stone-600">
            Vistaðu aðganginn með Google eða netfangi til að fá póst þegar þú færð skilaboð eða auglýsing passar við ósk.
          </p>
          <Link href="/profill/vista" className="mt-2 inline-block text-sm font-semibold text-orange-700 underline">
            Vista aðgang
          </Link>
        </>
      )}
    </section>
  );
}
