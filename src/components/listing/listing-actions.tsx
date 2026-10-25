"use client";

import { ArrowUp, ChevronLeft, Heart, Share2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/lang-provider";

const overlayBtn =
  "pointer-events-auto flex size-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md transition active:scale-90";

export function BackButton() {
  const { t } = useT();
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label={t("Til baka")}
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
      className={overlayBtn}
    >
      <ChevronLeft size={24} />
    </button>
  );
}

export function ShareButton({ title, text }: { title: string; text: string }) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href.split("?")[0];
    if (navigator.share) {
      await navigator.share({ title, text, url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }
  return (
    <button type="button" aria-label={t("Deila")} onClick={share} className={`${overlayBtn} relative`}>
      <Share2 size={19} />
      {copied && (
        <span className="absolute right-0 top-12 whitespace-nowrap rounded-lg bg-black/80 px-2 py-1 text-xs">{t("Hlekkur afritaður")}</span>
      )}
    </button>
  );
}

// Hjarta: vistar auglýsingu í uppáhalds. Gestir fara fyrst í gegnum /byrja.
export function FavoriteButton({
  listingId,
  initial,
  variant = "card",
}: {
  listingId: string;
  initial: boolean;
  variant?: "card" | "overlay";
}) {
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const [on, setOn] = useState(initial);
  const [pop, setPop] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return router.push(`/byrja?next=${encodeURIComponent(pathname)}`);

    const next = !on;
    setOn(next);
    if (next) {
      setPop(true);
      setTimeout(() => setPop(false), 350);
    }
    const { error } = next
      ? await supabase.from("favorites").insert({ user_id: session.user.id, listing_id: listingId })
      : await supabase.from("favorites").delete().eq("user_id", session.user.id).eq("listing_id", listingId);
    if (error && error.code !== "23505") setOn(!next);
  }

  const cls =
    variant === "overlay"
      ? overlayBtn
      : "flex size-9 items-center justify-center rounded-full bg-white/90 text-stone-700 shadow-md backdrop-blur transition active:scale-90 dark:bg-black/50 dark:text-white";

  return (
    <button type="button" onClick={toggle} aria-pressed={on} aria-label={on ? t("Fjarlægja úr uppáhalds") : t("Setja í uppáhalds")} className={cls}>
      <Heart
        size={variant === "overlay" ? 20 : 18}
        className={`transition-transform ${pop ? "scale-125" : ""} ${on ? "fill-red-500 text-red-500" : ""}`}
      />
    </button>
  );
}

const DAY = 86_400_000;

export function BumpButton({ listingId, bumpedAt, publishedAt }: { listingId: string; bumpedAt: string | null; publishedAt: string | null }) {
  const { t } = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const last = Math.max(new Date(bumpedAt ?? 0).getTime(), new Date(publishedAt ?? 0).getTime());
  const daysLeft = Math.ceil((last + 7 * DAY - Date.now()) / DAY);

  return (
    <div className="relative flex-1">
      <button
        type="button"
        disabled={pending || daysLeft > 0}
        onClick={() =>
          start(async () => {
            const { error } = await createClient().rpc("bump_listing", { p_listing: listingId });
            if (error) setMsg(t("Ekki hægt núna"));
            else {
              setMsg(t("Ýtt upp!"));
              router.refresh();
            }
          })
        }
        title={daysLeft > 0 ? `Hægt eftir ${daysLeft} ${daysLeft === 1 ? "dag" : "daga"}` : t("Færa auglýsinguna efst")}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-surface py-3 text-base font-medium text-stone-700 active:bg-stone-100 disabled:opacity-50"
      >
        <ArrowUp size={18} /> {daysLeft > 0 ? `${daysLeft} d.` : t("Ýta upp")}
      </button>
      {msg && <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-black/80 px-2 py-1 text-xs text-white">{msg}</span>}
    </div>
  );
}
