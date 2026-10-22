// Sent á window þegar ólesið breytist, svo valmyndin uppfæri merkið sitt
export const UNREAD_EVENT = "partar:unread-changed";

export type Message = {
  id: number;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

const timeFmt = new Intl.DateTimeFormat("is-IS", { hour: "2-digit", minute: "2-digit", timeZone: "Atlantic/Reykjavik" });
const dayFmt = new Intl.DateTimeFormat("is-IS", { day: "numeric", month: "short", timeZone: "Atlantic/Reykjavik" });
const longDayFmt = new Intl.DateTimeFormat("is-IS", { weekday: "long", day: "numeric", month: "long", timeZone: "Atlantic/Reykjavik" });

function dayKey(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Atlantic/Reykjavik" });
}

// Klukka ef í dag, annars dagsetning (fyrir samtalalista)
export function shortTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  return dayKey(d) === dayKey(now) ? timeFmt.format(d) : dayFmt.format(d);
}

export function messageTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}

// Fyrirsögn dags í spjallþræði
export function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (dayKey(d) === dayKey(now)) return "Í dag";
  if (dayKey(d) === dayKey(yesterday)) return "Í gær";
  return longDayFmt.format(d);
}

export function sameDay(a: string, b: string): boolean {
  return dayKey(new Date(a)) === dayKey(new Date(b));
}
