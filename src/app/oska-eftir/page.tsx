import { BellRing, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LiveRefresh } from "@/components/live-refresh";
import { PushToggle } from "@/components/push-toggle";
import { formatPrice } from "@/lib/i18n";
import { Thumb } from "@/components/listing/thumb";
import { LISTING_SUMMARY_SELECT, coverOf, timeAgo, type ListingSummary } from "@/lib/listings";
import { searchHref } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import { WANTED_SELECT, describeWanted, wantedTitle, wantedToFilters, type Wanted } from "@/lib/wanted";
import { setWantedActive } from "./actions";
import { DeleteWantedButton } from "./delete-wanted-button";
import { MarkNotificationsRead } from "./mark-read";

export const metadata = { title: "Óska eftir – Partar" };

type NotificationRow = {
  id: number;
  read_at: string | null;
  created_at: string;
  listings: ListingSummary | null;
  wanted_requests: Wanted | null;
};

export default async function WantedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/?villa=tenging");

  const [notifications, wanted, makes, models, categories] = await Promise.all([
    supabase
      .from("notifications")
      .select(`id, read_at, created_at, listings(${LISTING_SUMMARY_SELECT}), wanted_requests(${WANTED_SELECT})`)
      .order("created_at", { ascending: false })
      .limit(30)
      .returns<NotificationRow[]>(),
    supabase.from("wanted_requests").select(WANTED_SELECT).order("created_at", { ascending: false }).returns<Wanted[]>(),
    supabase.from("makes").select("id, name"),
    supabase.from("models").select("id, make_id, name"),
    supabase.from("categories").select("id, parent_id, name, sort"),
  ]);

  // Tilkynningar um auglýsingar sem hafa verið fjarlægðar eru faldar
  const notes = (notifications.data ?? []).filter((n) => n.listings);
  const wants = wanted.data ?? [];
  const m = makes.data ?? [];
  const mo = models.data ?? [];
  const c = categories.data ?? [];

  return (
    <div className="mx-auto max-w-md md:max-w-2xl md:pt-10 space-y-6 px-4 pt-6">
      <LiveRefresh channel={`tilkynningar:${user.id}`} table="notifications" event="INSERT" filter={`user_id=eq.${user.id}`} />
      <MarkNotificationsRead key={notes[0]?.id} hasUnread={notes.some((n) => !n.read_at)} />

      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Óska eftir</h1>
        <Link href="/oska-eftir/ny" className="inline-flex items-center gap-1 rounded-full bg-orange-600 py-2 pl-3 pr-4 text-sm font-semibold text-white shadow-md shadow-orange-600/25 active:bg-orange-700">
          <Plus size={17} strokeWidth={2.6} /> Ný ósk
        </Link>
      </header>

      {wants.length > 0 && <PushToggle compact />}

      {wants.length === 0 && notes.length === 0 && (
        <div className="rounded-2xl bg-surface p-6 text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600" aria-hidden>
            <BellRing size={28} />
          </div>
          <p className="font-medium">Vantar þig eitthvað?</p>
          <p className="mt-1 text-sm text-stone-600">
            Skráðu hvað þú leitar að og við látum þig vita um leið og auglýsing sem passar birtist.
          </p>
          <Link href="/oska-eftir/ny" className="mt-4 inline-block font-semibold text-orange-600">
            Skrá fyrstu óskina →
          </Link>
        </div>
      )}

      {notes.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">Tilkynningar</h2>
          <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl bg-surface">
            {notes.map((n) => {
              const l = n.listings!;
              const unread = !n.read_at;
              return (
                <li key={n.id}>
                  <Link href={`/auglysing/${l.id}`} className={`flex gap-3 p-3 active:bg-stone-50 ${unread ? "bg-orange-50" : ""}`}>
                    <Thumb image={coverOf(l.listing_images)} className="size-16 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-orange-700">
                        {unread && <span className="mr-1 inline-block size-2 rounded-full bg-orange-600" aria-label="Nýtt" />}
                        Passar við {n.wanted_requests ? wantedTitle(n.wanted_requests, m, c) : "ósk"}
                      </p>
                      <p className={`truncate ${unread ? "font-bold" : "font-medium"}`}>{l.title}</p>
                      <p className="text-sm">
                        <span className="font-bold text-orange-600">{formatPrice(l.price_isk)}</span>
                        <span className="text-stone-500"> · {timeAgo(n.created_at)}</span>
                        {l.status === "sold" && <span className="ml-1 font-bold text-red-600">SELT</span>}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {wants.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">Mínar óskir</h2>
          <ul className="space-y-2">
            {wants.map((w) => (
              <li key={w.id} className={`rounded-2xl bg-surface p-4 ${w.active ? "" : "opacity-60"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{wantedTitle(w, m, c)}</p>
                    <p className="mt-0.5 text-sm text-stone-600">{describeWanted(w, m, mo, c).join(" · ")}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      w.active ? "bg-green-100 text-green-800" : "bg-stone-200 text-stone-600"
                    }`}
                  >
                    {w.active ? "Virk" : "Í hléi"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium">
                  <Link href={searchHref(wantedToFilters(w))} className="text-orange-700">
                    Sjá það sem passar nú þegar
                  </Link>
                  <form action={setWantedActive.bind(null, w.id, !w.active)}>
                    <button type="submit" className="text-stone-600">
                      {w.active ? "Setja í hlé" : "Virkja aftur"}
                    </button>
                  </form>
                  <DeleteWantedButton id={w.id} title={wantedTitle(w, m, c)} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
