"use client";

import { Ban, Camera, ChevronLeft, Loader2, SendHorizontal, Star } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/avatar";
import { Thumb } from "@/components/listing/thumb";
import { PushPrompt } from "@/components/push-prompt";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { inputClass, primaryButton } from "@/components/ui/styles";
import { MESSAGE_COLS, QUICK_REPLIES, UNREAD_EVENT, dayLabel, messageTime, sameDay, type Message } from "@/lib/chat";
import { formatPrice } from "@/lib/i18n";
import { processImage } from "@/lib/images";
import type { ImageRef } from "@/lib/listings";
import { createClient } from "@/lib/supabase/client";
import { setBlocked } from "./actions";

type Props = {
  conversationId: string;
  userId: string;
  otherId: string;
  iBlocked: boolean;
  myReview: number | null;
  otherName: string;
  role: "buyer" | "seller";
  listing: { id: string; title: string; price: number | null; sold: boolean; cover: ImageRef | null } | null;
  initialMessages: Message[];
};

// Skilaboð sem eru á leiðinni fá neikvætt bráðabirgðaauðkenni; myndir sýna staðbundna forskoðun
type ChatMessage = Message & { state?: "sending" | "failed"; localUrl?: string };

export function ChatThread(props: Props) {
  const { conversationId, userId, otherId, iBlocked, otherName, role, listing, initialMessages } = props;
  const [blockPending, startBlock] = useTransition();
  const [supabase] = useState(createClient);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [live, setLive] = useState(true);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [myReview, setMyReview] = useState(props.myReview);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const tempId = useRef(-1);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Lokuð geymsla: undirritaðar slóðir fyrir myndir sem ekki hafa slóð enn
  useEffect(() => {
    const missing = messages.flatMap((m) => (m.image_path && !urls[m.image_path] && !m.localUrl ? [m.image_path] : []));
    if (!missing.length) return;
    supabase.storage
      .from("chat-images")
      .createSignedUrls(missing, 3600)
      .then(({ data }) => {
        if (!data) return;
        setUrls((prev) => ({ ...prev, ...Object.fromEntries(data.flatMap((d) => (d.signedUrl && d.path ? [[d.path, d.signedUrl]] : []))) }));
      });
  }, [messages, urls, supabase]);

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
    let query = supabase.from("messages").select(MESSAGE_COLS).eq("conversation_id", conversationId).order("created_at");
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

  async function insert(pending: ChatMessage, retry: boolean) {
    setMessages((prev) => (retry ? prev.map((m) => (m.id === pending.id ? pending : m)) : [...prev, pending]));
    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        body: pending.body,
        image_path: pending.image_path,
        image_color: pending.image_color,
      })
      .select(MESSAGE_COLS)
      .single<Message>();

    setMessages((prev) => {
      if (error || !data) return prev.map((m) => (m.id === pending.id ? { ...m, state: "failed" } : m));
      // Rauntíminn gæti þegar hafa skilað skilaboðunum
      const withoutTemp = prev.filter((m) => m.id !== pending.id);
      if (pending.localUrl && data.image_path) setUrls((u) => ({ ...u, [data.image_path!]: pending.localUrl! }));
      return withoutTemp.some((m) => m.id === data.id) ? withoutTemp : [...withoutTemp, data];
    });
  }

  function send(body: string) {
    const text = body.trim();
    if (!text) return;
    setDraft("");
    void insert(
      {
        id: tempId.current--,
        conversation_id: conversationId,
        sender_id: userId,
        body: text,
        image_path: null,
        image_color: null,
        created_at: new Date().toISOString(),
        state: "sending",
      },
      false,
    );
  }

  async function sendImage(file: File) {
    setUploading(true);
    try {
      const img = await processImage(file);
      const path = `${conversationId}/${img.id}.${img.ext}`;
      const { error } = await supabase.storage.from("chat-images").upload(path, img.blob, { contentType: img.blob.type });
      if (error) throw error;
      await insert(
        {
          id: tempId.current--,
          conversation_id: conversationId,
          sender_id: userId,
          body: draft.trim(),
          image_path: path,
          image_color: img.color,
          created_at: new Date().toISOString(),
          state: "sending",
          localUrl: img.url,
        },
        false,
      );
      setDraft("");
    } catch {
      alert("Ekki tókst að senda myndina. Reyndu aftur.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const sellerReplied = messages.some((m) => m.sender_id === otherId && m.id > 0);
  const canReview = role === "buyer" && sellerReplied;

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-md flex-col bg-canvas">
      <header className="flex items-center gap-2 border-b border-line bg-surface/95 px-2 py-2 backdrop-blur">
        <Link href="/skilabod" aria-label="Til baka" className="flex size-10 items-center justify-center text-stone-600">
          <ChevronLeft size={26} />
        </Link>
        <Avatar name={otherName} size={38} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{otherName}</p>
          <p className="flex items-center gap-1.5 text-xs text-stone-500">
            <span className={`size-1.5 rounded-full ${live ? "bg-green-500" : "bg-stone-400"}`} />
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
          aria-label={iBlocked ? "Opna fyrir notanda" : "Loka á notanda"}
          className="flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-stone-600 active:bg-stone-100 disabled:opacity-50"
        >
          <Ban size={16} /> {iBlocked ? "Opna" : "Loka á"}
        </button>
      </header>

      {iBlocked && (
        <p className="bg-stone-800 px-4 py-2 text-center text-sm text-white">Þú hefur lokað á {otherName}. Hvorugt ykkar getur sent skilaboð.</p>
      )}

      {listing && (
        <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2">
          <Link href={`/auglysing/${listing.id}`} className="flex min-w-0 flex-1 items-center gap-3">
            <Thumb image={listing.cover} className="size-11 shrink-0 rounded-xl" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{listing.title}</p>
              <p className="text-sm font-extrabold text-orange-600">{listing.sold ? "SELT" : formatPrice(listing.price)}</p>
            </div>
          </Link>
          {canReview && (
            <button
              type="button"
              onClick={() => setReviewOpen(true)}
              className="flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-900"
            >
              <Star size={15} className={myReview ? "fill-amber-400 text-amber-400" : "text-amber-500"} />
              {myReview ? `${myReview}/5` : "Gefa einkunn"}
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-3" aria-live="polite">
        {messages.length === 0 && (
          <div className="mt-10 text-center">
            <Avatar name={otherName} size={56} />
            <p className="mt-3 font-semibold">{otherName}</p>
            <p className="mt-1 text-sm text-stone-500">{role === "buyer" ? "Spurðu seljandann um hlutinn." : "Engin skilaboð enn."}</p>
          </div>
        )}
        {messages.map((m, i) => {
          const mine = m.sender_id === userId;
          const newDay = i === 0 || !sameDay(messages[i - 1].created_at, m.created_at);
          const src = m.localUrl ?? (m.image_path ? urls[m.image_path] : undefined);
          return (
            <div key={m.id}>
              {newDay && <p className="my-3 text-center text-xs font-semibold text-stone-500">{dayLabel(m.created_at)}</p>}
              <div className={`mb-1.5 flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] overflow-hidden rounded-[20px] ${
                    mine ? "rounded-br-md bg-gradient-to-br from-orange-500 to-orange-600 text-white" : "rounded-bl-md bg-surface text-stone-900 shadow-sm"
                  } ${m.state === "sending" ? "opacity-60" : ""}`}
                >
                  {m.image_path && (
                    <a href={src} target="_blank" rel="noreferrer" className="block" style={{ backgroundColor: m.image_color ?? "#78716c" }}>
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element -- undirrituð slóð úr lokaðri geymslu
                        <img src={src} alt="Mynd í spjalli" className="max-h-72 w-full min-w-48 object-cover" />
                      ) : (
                        <div className="flex h-48 w-56 items-center justify-center">
                          <Loader2 className="animate-spin text-white/80" />
                        </div>
                      )}
                    </a>
                  )}
                  {(m.body || !m.image_path) && <p className="whitespace-pre-wrap break-words px-3.5 pt-2">{m.body}</p>}
                  <p className={`px-3.5 pb-1.5 pt-0.5 text-right text-[10px] ${mine ? "text-orange-100" : "text-stone-400"}`}>
                    {m.state === "sending" ? "Sendi…" : messageTime(m.created_at)}
                  </p>
                </div>
              </div>
              {m.state === "failed" && (
                <button
                  type="button"
                  onClick={() => void insert({ ...m, state: "sending" }, true)}
                  className="mb-2 ml-auto block text-xs font-medium text-red-600"
                >
                  Ekki sent – ýttu til að reyna aftur. Ef það gengur ekki hefur viðtakandinn lokað á skilaboð.
                </button>
              )}
            </div>
          );
        })}
        {messages.some((m) => m.sender_id === userId) && <PushPrompt reason={`Viltu vita þegar ${otherName} svarar?`} />}
        <div ref={endRef} />
      </div>

      {!iBlocked && (
        <div className="border-t border-line bg-surface pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          {!draft && (
            <div className="flex gap-2 overflow-x-auto px-3 pt-2 [scrollbar-width:none]">
              {QUICK_REPLIES[role].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => send(r)}
                  className="shrink-0 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-800 active:scale-95"
                >
                  {r}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
            className="flex items-end gap-2 px-3 pt-2"
          >
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              aria-label="Senda mynd"
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600 active:bg-stone-200 disabled:opacity-60"
            >
              {uploading ? <Loader2 size={20} className="animate-spin" /> : <Camera size={21} />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => e.target.files?.[0] && sendImage(e.target.files[0])}
            />
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
              className="max-h-32 min-h-11 flex-1 resize-none rounded-[22px] border border-stone-300 bg-canvas px-4 py-2.5 text-base outline-none [field-sizing:content] focus:border-orange-500"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label="Senda"
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white transition active:scale-90 disabled:from-stone-300 disabled:to-stone-300"
            >
              <SendHorizontal size={20} />
            </button>
          </form>
        </div>
      )}

      {canReview && (
        <ReviewSheet
          open={reviewOpen}
          onClose={() => setReviewOpen(false)}
          conversationId={conversationId}
          userId={userId}
          sellerId={otherId}
          sellerName={otherName}
          initial={myReview}
          onSaved={setMyReview}
        />
      )}
    </div>
  );
}

function ReviewSheet(props: {
  open: boolean;
  onClose: () => void;
  conversationId: string;
  userId: string;
  sellerId: string;
  sellerName: string;
  initial: number | null;
  onSaved: (stars: number) => void;
}) {
  const [stars, setStars] = useState(props.initial ?? 0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function save() {
    setSaving(true);
    setError(false);
    const { error } = await createClient()
      .from("reviews")
      .upsert(
        {
          conversation_id: props.conversationId,
          reviewer_id: props.userId,
          seller_id: props.sellerId,
          stars,
          comment: comment.trim() || null,
        },
        { onConflict: "conversation_id,reviewer_id" },
      );
    setSaving(false);
    if (error) return setError(true);
    props.onSaved(stars);
    props.onClose();
  }

  return (
    <BottomSheet
      open={props.open}
      onClose={props.onClose}
      title={`Einkunn fyrir ${props.sellerName}`}
      footer={
        <button type="button" disabled={!stars || saving} onClick={save} className={primaryButton}>
          {saving ? "Vista…" : "Vista einkunn"}
        </button>
      }
    >
      <div className="space-y-4">
        <div className="flex justify-center gap-2" role="radiogroup" aria-label="Stjörnur">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} stjörnur`} onClick={() => setStars(n)}>
              <Star size={40} className={n <= stars ? "fill-amber-400 text-amber-400" : "text-stone-300"} />
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 500))}
          rows={3}
          placeholder="Hvernig gengu viðskiptin? (valfrjálst)"
          className={inputClass}
        />
        {error && <p className="text-sm text-red-600">Ekki tókst að vista einkunnina.</p>}
        <p className="text-xs text-stone-500">Einkunnin birtist á auglýsingum seljandans.</p>
      </div>
    </BottomSheet>
  );
}
