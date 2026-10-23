import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { setListingStatus } from "@/app/auglysing/[id]/actions";
import { formatPrice } from "@/lib/i18n";
import { Thumb } from "@/components/listing/thumb";
import { IMAGE_COLS, coverOf, timeAgo, type ImageRef } from "@/lib/listings";
import { createClient } from "@/lib/supabase/server";
import { DeleteListingButton } from "./delete-button";

export const metadata = { title: "Mínar auglýsingar – Partar" };

type Row = {
  id: string;
  title: string;
  status: "draft" | "active" | "sold" | "removed";
  price_isk: number | null;
  published_at: string | null;
  created_at: string;
  listing_images: ImageRef[];
  conversations: { count: number }[];
};

const TABS = {
  virkar: { label: "Til sölu", statuses: ["active", "draft"] },
  seldar: { label: "Selt", statuses: ["sold"] },
} as const;
type Tab = keyof typeof TABS;

export default async function MyListingsPage({ searchParams }: { searchParams: Promise<{ flipi?: string }> }) {
  const { flipi } = await searchParams;
  const tab: Tab = flipi === "seldar" ? "seldar" : "virkar";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/?villa=tenging");

  const { data } = await supabase
    .from("listings")
    .select(`id, title, status, price_isk, published_at, created_at, listing_images(${IMAGE_COLS}), conversations(count)`)
    .eq("seller_id", user.id)
    .neq("status", "removed")
    .order("created_at", { ascending: false })
    .returns<Row[]>();
  const all = data ?? [];
  const counts = {
    virkar: all.filter((l) => l.status !== "sold").length,
    seldar: all.filter((l) => l.status === "sold").length,
  };
  const rows = all.filter((l) => (TABS[tab].statuses as readonly string[]).includes(l.status));

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <header className="mb-4 flex items-center gap-2">
        <Link href="/profill" aria-label="Til baka" className="-ml-2 px-2 text-2xl text-stone-600">
          <ChevronLeft size={26} />
        </Link>
        <h1 className="text-2xl font-bold">Mínar auglýsingar</h1>
      </header>

      <nav aria-label="Staða" className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-stone-200 p-1">
        {(Object.keys(TABS) as Tab[]).map((t) => (
          <Link
            key={t}
            href={t === "virkar" ? "/minar-auglysingar" : "/minar-auglysingar?flipi=seldar"}
            aria-current={t === tab ? "page" : undefined}
            className={`rounded-lg py-2 text-center text-sm font-medium ${t === tab ? "bg-surface shadow-sm" : "text-stone-600"}`}
          >
            {TABS[t].label} ({counts[t]})
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <div className="rounded-2xl bg-surface p-6 text-center">
          <p className="font-medium">{tab === "virkar" ? "Engar auglýsingar til sölu" : "Ekkert selt enn"}</p>
          {tab === "virkar" && (
            <Link href="/ny-auglysing" className="mt-3 inline-block font-semibold text-orange-600">
              Setja inn auglýsingu →
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((l) => {
            const chats = l.conversations[0]?.count ?? 0;
            return (
              <li key={l.id} className="rounded-2xl bg-surface p-3">
                <Link href={`/auglysing/${l.id}`} className="flex gap-3">
                  <Thumb
                    image={coverOf(l.listing_images)}
                    className={`size-16 shrink-0 rounded-xl ${l.status === "sold" ? "grayscale" : ""}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{l.title}</p>
                    <p className="font-bold text-orange-600">{formatPrice(l.price_isk)}</p>
                    <p className="text-xs text-stone-500">
                      {l.status === "draft" ? (
                        <span className="font-medium text-stone-700">Óbirt</span>
                      ) : (
                        `Birt ${timeAgo(l.published_at ?? l.created_at)}`
                      )}
                      {chats > 0 && ` · 💬 ${chats} ${chats === 1 ? "samtal" : "samtöl"}`}
                    </p>
                  </div>
                </Link>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-stone-100 pt-2 text-sm font-medium">
                  <Link href={`/auglysing/${l.id}/breyta`} className="text-orange-700">
                    Breyta
                  </Link>
                  {l.status !== "draft" && (
                    <form action={setListingStatus.bind(null, l.id, l.status === "sold" ? "active" : "sold")}>
                      <button type="submit" className="text-stone-700">
                        {l.status === "sold" ? "Setja aftur í sölu" : "Merkja selt"}
                      </button>
                    </form>
                  )}
                  <DeleteListingButton listingId={l.id} title={l.title} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
