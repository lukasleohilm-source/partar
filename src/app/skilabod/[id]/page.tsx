import { notFound, redirect } from "next/navigation";
import type { Message } from "@/lib/chat";
import { createClient } from "@/lib/supabase/server";
import { ChatThread } from "./chat-thread";

export const metadata = { title: "Spjall – Partar" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Conversation = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  listings: { title: string; price_isk: number | null; status: string; listing_images: { path: string; sort: number }[] } | null;
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
         listings(title, price_isk, status, listing_images(path, sort)),
         buyer:profiles!conversations_buyer_id_fkey(display_name),
         seller:profiles!conversations_seller_id_fkey(display_name)`,
      )
      .eq("id", id)
      .maybeSingle<Conversation>(),
    supabase
      .from("messages")
      .select("id, conversation_id, sender_id, body, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<Message[]>(),
  ]);
  if (!conv) notFound();

  const iAmBuyer = conv.buyer_id === user.id;
  const otherId = iAmBuyer ? conv.seller_id : conv.buyer_id;
  const { data: block } = await supabase
    .from("blocks")
    .select("blocked_id")
    .eq("blocker_id", user.id)
    .eq("blocked_id", otherId)
    .maybeSingle();
  const cover = conv.listings?.listing_images.sort((a, b) => a.sort - b.sort)[0];

  return (
    <ChatThread
      conversationId={conv.id}
      userId={user.id}
      otherId={otherId}
      iBlocked={Boolean(block)}
      otherName={iAmBuyer ? conv.seller.display_name : conv.buyer.display_name}
      role={iAmBuyer ? "buyer" : "seller"}
      listing={
        conv.listings
          ? {
              id: conv.listing_id,
              title: conv.listings.title,
              price: conv.listings.price_isk,
              sold: conv.listings.status === "sold",
              cover: cover?.path ?? null,
            }
          : null
      }
      initialMessages={(messages ?? []).reverse()}
    />
  );
}
