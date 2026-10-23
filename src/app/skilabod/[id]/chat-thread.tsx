"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { UNREAD_EVENT, dayLabel, messageTime, sameDay, type Message } from "@/lib/chat";
import { formatPrice } from "@/lib/i18n";
import { Thumb } from "@/components/listing/thumb";
import type { ImageRef } from "@/lib/listings";
import { createClient } from "@/lib/supabase/client";
import { setBlocked } from "./actions";

type Props = {
  conversationId: string;
  userId: string;
  otherId: string;
  iBlocked: boolean;
  otherName: string;
  role: "buyer" | "seller";
  listing: { id: string; title: string; price: number | null; sold: boolean; cover: ImageRef | null } | null;
  initialMessages: Message[];
};

// Skilaboð sem eru á leiðinni fá neikvætt bráðabirgðaauðkenni
type ChatMessage = Message & { state?: "sending" | "failed" };

export function ChatThread({ conversationId, userId, otherId, iBlocked, otherName, role, listing, initialMessages }: Props) {
  const [blockPending, startBlock] = useTransition();
  const [supabase] = useState(createClient);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [live, setLive] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const tempId = useRef(-1);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const addMessage = useCallback((m: Message) => {
    setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
  }, []);

  const markRead = useCallback(async () => {
    await supabase.rpc("mark_conversation_read", { p_conversation: conversationId });
    window.dispatchEvent(new Event(UNREAD_EVENT));
  }, [supabase, conversationId]);

  // Sækir skilaboð sem kunna að hafa misst af (t.d. þegar sími var í dvala)
  const catchUp = useCallback(async () => {
    const last = [...messagesRef.current].reverse().find((m) => m.id > 0);
    let query = supabase
      .from("messages")
      .select("id, conversation_id, sender_id, body, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at");
    if (last) query = query.gt("id", last.id);
    const { data } = await query.returns<Message[]>();
    data?.forEach(addMessage);
    if (data?.length) markRead();
  }, [supabase, conversationId, addMessage, markRead]);

  useEffect(() => {
    markRead();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      // Rauntími þarf aðgangslykil notandans svo RLS hleypi skilaboðunum í gegn
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) supabase.realtime.setAuth(session.access_token);

      channel = supabase
        .channel(`samtal:${conversationId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
          (payload) => {
            const m = payload.new as Message;
            addMessage(m);
            if (m.sender_id !== userId) markRead();
          },
        )
        .subscribe((status) => {
          setLive(status === "SUBSCRIBED");
          if (status === "SUBSCRIBED") catchUp();
        });
    })();

    const onVisible = () => document.visibilityState === "visible" && catchUp();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase, conversationId, userId, addMessage, markRead, catchUp]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(body: string, retryId?: number) {
    const text = body.trim();
    if (!text) return;
    const id = retryId ?? tempId.current--;
    const pending: ChatMessage = {
      id,
      conversation_id: conversationId,
      sender_id: userId,
      body: text,
      created_at: new Date().toISOString(),
      state: "sending",
    };
    setMessages((prev) => (retryId ? prev.map((m) => (m.id === id ? pending : m)) : [...prev, pending]));
    if (!retryId) setDraft("");

    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: userId, body: text })
      .select("id, conversation_id, sender_id, body, created_at")
      .single<Message>();

    setMessages((prev) => {
      if (error || !data) return prev.map((m) => (m.id === id ? { ...m, state: "failed" } : m));
      // Rauntíminn gæti þegar hafa skilað skilaboðunum
      const withoutTemp = prev.filter((m) => m.id !== id);
      return withoutTemp.some((m) => m.id === data.id) ? withoutTemp : [...withoutTemp, data];
    });
  }

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-md flex-col bg-stone-100">
      <header className="flex items-center gap-2 border-b border-stone-200 bg-surface px-2 py-2">
        <Link href="/skilabod" aria-label="Til baka" className="px-2 text-2xl text-stone-600">
          <ChevronLeft size={26} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{otherName}</p>
          <p className="text-xs text-stone-500">
            {role === "buyer" ? "Seljandi" : "Kaupandi"}
            {!live && " · tengist…"}
          </p>
        </div>
        <button
          type="button"
          disabled={blockPending}
          onClick={() => {
            const msg = iBlocked
              ? `Opna aftur fyrir ${otherName}?`
              : `Loka á ${otherName}? Viðkomandi getur ekki sent þér skilaboð og þú sérð ekki auglýsingar viðkomandi í leit.`;
            if (window.confirm(msg)) startBlock(() => setBlocked(conversationId, otherId, !iBlocked));
          }}
          className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-stone-600 active:bg-stone-100 disabled:opacity-50"
        >
          {iBlocked ? "Opna fyrir" : "🚫 Loka á"}
        </button>
      </header>

      {iBlocked && (
        <p className="bg-stone-800 px-4 py-2 text-center text-sm text-white">
          Þú hefur lokað á {otherName}. Hvorugt ykkar getur sent skilaboð.
        </p>
      )}

      {listing && (
        <Link href={`/auglysing/${listing.id}`} className="flex items-center gap-3 border-b border-stone-200 bg-surface px-4 py-2">
          <Thumb image={listing.cover} className="size-10 shrink-0 rounded-lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{listing.title}</p>
            <p className="text-sm font-bold text-orange-600">
              {listing.sold ? "SELT" : formatPrice(listing.price)}
            </p>
          </div>
        </Link>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-3" aria-live="polite">
        {messages.length === 0 && (
          <p className="mt-8 text-center text-sm text-stone-500">
            {role === "buyer" ? "Spurðu seljandann um hlutinn." : "Engin skilaboð enn."}
          </p>
        )}
        {messages.map((m, i) => {
          const mine = m.sender_id === userId;
          const newDay = i === 0 || !sameDay(messages[i - 1].created_at, m.created_at);
          return (
            <div key={m.id}>
              {newDay && <p className="my-3 text-center text-xs font-medium text-stone-500">{dayLabel(m.created_at)}</p>}
              <div className={`mb-1.5 flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
                    mine ? "rounded-br-md bg-orange-600 text-white" : "rounded-bl-md bg-surface text-stone-900"
                  } ${m.state === "sending" ? "opacity-60" : ""}`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`mt-0.5 text-right text-[10px] ${mine ? "text-orange-100" : "text-stone-400"}`}>
                    {m.state === "sending" ? "Sendi…" : messageTime(m.created_at)}
                  </p>
                </div>
              </div>
              {m.state === "failed" && (
                <button
                  type="button"
                  onClick={() => send(m.body, m.id)}
                  className="mb-2 ml-auto block text-xs font-medium text-red-600"
                >
                  Ekki sent – ýttu til að reyna aftur. Ef það gengur ekki hefur viðtakandinn lokað á skilaboð.
                </button>
              )}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form
        hidden={iBlocked}
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="flex items-end gap-2 border-t border-stone-200 bg-surface px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, 2000))}
          onKeyDown={(e) => {
            // Enter sendir á tölvu; Shift+Enter er ný lína
            if (e.key === "Enter" && !e.shiftKey && !("ontouchstart" in window)) {
              e.preventDefault();
              send(draft);
            }
          }}
          rows={1}
          placeholder="Skrifaðu skilaboð…"
          aria-label="Skilaboð"
          className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-stone-300 px-4 py-2.5 text-base outline-none [field-sizing:content] focus:border-orange-500"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Senda"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-orange-600 text-lg text-white disabled:bg-stone-300"
        >
          ➤
        </button>
      </form>
    </div>
  );
}
