import { formatDate, formatTime } from "./i18n";
import type { Lang } from "./lang";

// Sent á window þegar ólesið breytist, svo valmyndin uppfæri merkið sitt
export const UNREAD_EVENT = "partar:unread-changed";

export type Message = {
  id: number;
  conversation_id: string;
  sender_id: string;
  body: string;
  image_path: string | null;
  image_color: string | null;
  created_at: string;
};

export const MESSAGE_COLS = "id, conversation_id, sender_id, body, image_path, image_color, created_at";

// Flýtisvör sem birtast meðan ekkert er skrifað
export const QUICK_REPLIES = {
  buyer: ["Er þetta enn til?", "Hvað er lægsta verð?", "Hvar get ég sótt?", "Passar þetta í bílinn minn?"],
  seller: ["Já, enn til!", "Því miður selt.", "Hvenær viltu sækja?", "Ég get sent mynd."],
} as const;

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10); // Ísland er á UTC
}

// Klukka ef í dag, annars dagsetning (fyrir samtalalista)
export function shortTime(iso: string, now = new Date(), lang: Lang = "is"): string {
  const d = new Date(iso);
  return dayKey(d) === dayKey(now) ? formatTime(d) : formatDate(d, { month: "short" }, lang);
}

export function messageTime(iso: string): string {
  return formatTime(new Date(iso));
}

// Fyrirsögn dags í spjallþræði
export function dayLabel(iso: string, now = new Date(), lang: Lang = "is"): string {
  const d = new Date(iso);
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (dayKey(d) === dayKey(now)) return lang === "en" ? "Today" : "Í dag";
  if (dayKey(d) === dayKey(yesterday)) return lang === "en" ? "Yesterday" : "Í gær";
  return formatDate(d, { weekday: true }, lang);
}

export function sameDay(a: string, b: string): boolean {
  return dayKey(new Date(a)) === dayKey(new Date(b));
}
