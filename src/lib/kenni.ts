// Staðfesting seljenda með rafrænum skilríkjum í gegnum Kenni (OpenID Connect).
// Opinberar stillingar; leynilyklarnir KENNI_CLIENT_SECRET og KENNI_VERIFY_SECRET eru Worker-leyndarmál.
export const KENNI_ISSUER = "https://idp.kenni.is/partar.lukels255.com";
export const KENNI_CLIENT_ID = "@partar.lukels255.com/web";
// national_id og audkenni_name eru gefin án samþykkisskjás (auto-consent)
export const KENNI_SCOPES = "openid national_id audkenni_name";
export const KENNI_FLOW_COOKIE = "kenni_flow";
export const KENNI_CALLBACK_PATH = "/auth/kenni";
// Ókeypis þróunaráskrift Kenni leyfir aðeins teymismeðlimum að auðkenna sig. Þangað til við erum
// komnir með Grow/Pro sjá aðeins stjórnendur hnappinn. Setja á true þegar áskriftin er komin.
export const KENNI_OPEN_TO_ALL = false;

export function base64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomToken(bytes = 32): string {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function pkceChallenge(verifier: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(hash));
}

export type KenniFlow = { state: string; nonce: string; verifier: string };

// Innihald ID-tóka. Hann kemur beint frá Kenni yfir TLS (bakrás frá þjóni okkar), svo samkvæmt
// OIDC 3.1.3.7 má sleppa undirskriftarathugun; útgefandi, viðtakandi, nonce og gildistími eru athuguð.
export function readIdToken(idToken: string): Record<string, unknown> {
  const part = idToken.split(".")[1];
  if (!part) throw new Error("bad_id_token");
  const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = Uint8Array.from(json, (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}
