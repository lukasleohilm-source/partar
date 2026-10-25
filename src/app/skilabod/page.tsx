import Link from "next/link";
import { redirect } from "next/navigation";
import { shortTime } from "@/lib/chat";
import { formatPrice } from "@/lib/i18n";
import { Thumb } from "@/components/listing/thumb";
import { IMAGE_COLS, coverOf, type ImageRef } from "@/lib/listings";
import { createClient } from "@/lib/supabase/server";
import { LiveRefresh } from "@/components/live-refresh";
import { getT } from "@/lib/lang-server";

export const metadata = { title: "Skilaboð – Partar" };

type Row = {
  id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at: string | null;
  last_message_body: string | null;
  last_sender_id: string | null;
  buyer_last_read_at: string | null;
  seller_last_read_at: string | null;
  listings: { title: string; price_isk: number | null; status: string; listing_images: ImageRef[] } | null;
  buyer: { display_name: string };
  seller: { display_name: string };
};

export default async function ConversationsPage() {
  const { t, lang } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/?villa=tenging");

  const { data } = await supabase
    .from("conversations")
    .select(
      `id, buyer_id, seller_id, last_message_at, last_message_body, last_sender_id,
       buyer_last_read_at, seller_last_read_at,
       listings(title, price_isk, status, listing_images(${IMAGE_COLS})),
       buyer:profiles!conversations_buyer_id_fkey(display_name),
       seller:profiles!conversations_seller_id_fkey(display_name)`,
    )
    .not("last_message_at", "is", null)
    .order("last_message_at", { ascending: false })
    .returns<Row[]>();
  const rows = data ?? [];

  return (
    <div className="mx-auto max-w-md md:max-w-2xl md:pt-10 px-4 pt-6">
      <h1 className="mb-4 text-2xl font-bold">{t("Skilaboð")}</h1>
      <LiveRefresh channel={`samtalalisti:${user.id}`} table="conversations" event="UPDATE" />

      {rows.length === 0 ? (
        <div className="rounded-2xl bg-surface p-6 text-center">
          <p className="font-medium">{t("Engin skilaboð enn")}</p>
          <p className="mt-1 text-sm text-stone-500">{t("Þegar þú hefur samband við seljanda birtist samtalið hér.")}</p>
          <Link href="/leit" className="mt-3 inline-block font-semibold text-orange-600">
            {t("Leita að hlutum →")}
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl bg-surface">
          {rows.map((c) => {
            const iAmBuyer = c.buyer_id === user.id;
            const other = iAmBuyer ? c.seller.display_name : c.buyer.display_name;
            const myRead = iAmBuyer ? c.buyer_last_read_at : c.seller_last_read_at;
            const unread =
              c.last_sender_id !== user.id &&
              (!myRead || new Date(c.last_message_at ?? 0) > new Date(myRead));
            const cover = coverOf(c.listings?.listing_images);

            return (
              <li key={c.id}>
                <Link href={`/skilabod/${c.id}`} className="flex gap-3 p-3 active:bg-stone-50">
                  <Thumb image={cover} className="size-14 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`truncate ${unread ? "font-bold" : "font-medium"}`}>{other}</p>
                      <span className={`shrink-0 text-xs ${unread ? "font-semibold text-orange-600" : "text-stone-500"}`}>
                        {c.last_message_at && shortTime(c.last_message_at, new Date(), lang)}
                      </span>
                    </div>
                    <p className="truncate text-xs text-stone-500">
                      {c.listings ? `${c.listings.title} · ${formatPrice(c.listings.price_isk, lang)}` : t("Auglýsing ekki lengur til")}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className={`truncate text-sm ${unread ? "font-semibold text-stone-900" : "text-stone-600"}`}>
                        {c.last_sender_id === user.id && t("Þú: ")}
                        {c.last_message_body}
                      </p>
                      {unread && <span className="ml-auto size-2.5 shrink-0 rounded-full bg-orange-600" aria-label={t("Ólesið")} />}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
