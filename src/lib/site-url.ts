import { headers } from "next/headers";

// Grunnslóð vefsins fyrir hlekki í tölvupósti. NEXT_PUBLIC_SITE_URL í framleiðslu, annars úr beiðninni.
export async function siteOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  return h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

export function confirmUrl(origin: string, next: string): string {
  return `${origin}/auth/confirm?next=${encodeURIComponent(next)}`;
}
