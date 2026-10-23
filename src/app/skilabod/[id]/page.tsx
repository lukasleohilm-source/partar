import { notFound, redirect } from "next/navigation";
import { MESSAGE_COLS, type Message } from "@/lib/chat";
import { IMAGE_COLS, coverOf, type ImageRef } from "@/lib/listings";
import { createClient } from "@/lib/supabase/server";
import { ChatThread } from "./chat-thread";

export const metadata = { title: "Spjall – Partar" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Conversation = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  listings: { title: string; price_isk: number | null; status: string; listing_images: ImageRef[] } | null;
  buyer: { display_name: string };
  seller: { display_name: string };
};

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/?villa=tenging");

  // RLS skilar aðeins samtölum sem notandinn tekur þátt í
  const [{ data: conv }, { data: messages }] = await Promise.all([
    supabase
      .from("conversations")
      .select(
        `id, listing_id, buyer_id, seller_id,
         listings(title, price_isk, status, listing_images(${IMAGE_COLS})),
         buyer:profiles!conversations_buyer_id_fkey(display_name),
         seller:profiles!conversations_seller_id_fkey(display_name)`,
      )
      .eq("id", id)
      .maybeSingle<Conversation>(),
    supabase
      .from("messages")
      .select(MESSAGE_COLS)
      .eq("conversation_id", id)
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<Message[]>(),
  ]);
  if (!conv) notFound();

  const iAmBuyer = conv.buyer_id === user.id;
  const otherId = iAmBuyer ? conv.seller_id : conv.buyer_id;
  const [{ data: block }, { data: review }] = await Promise.all([
    supabase.from("blocks").select("blocked_id").eq("blocker_id", user.id).eq("blocked_id", otherId).maybeSingle(),
    supabase.from("reviews").select("stars").eq("conversation_id", conv.id).eq("reviewer_id", user.id).maybeSingle(),
  ]);
  const cover = coverOf(conv.listings?.listing_images);

  return (
    <ChatThread
      conversationId={conv.id}
      userId={user.id}
      otherId={otherId}
      iBlocked={Boolean(block)}
      myReview={review?.stars ?? null}
      otherName={iAmBuyer ? conv.seller.display_name : conv.buyer.display_name}
      role={iAmBuyer ? "buyer" : "seller"}
      listing={
        conv.listings
          ? {
              id: conv.listing_id,
              title: conv.listings.title,
              price: conv.listings.price_isk,
              sold: conv.listings.status === "sold",
              cover,
            }
          : null
      }
      initialMessages={(messages ?? []).reverse()}
    />
  );
}
