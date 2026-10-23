import { headers } from "next/headers";

// Grunnslóð vefsins fyrir hlekki í tölvupósti. SITE_URL (keyrslubreyta í wrangler.jsonc) í framleiðslu,
// annars úr beiðninni.
export async function siteOrigin(): Promise<string> {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const h = await headers();
  return h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

export function confirmUrl(origin: string, next: string): string {
  return `${origin}/auth/confirm?next=${encodeURIComponent(next)}`;
}
