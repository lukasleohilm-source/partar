"use client";

// Innskráning með Google beint á okkar léni: Google skilar ID-tóka á /auth/google og
// Supabase staðfestir hann (signInWithIdToken). Þá stendur „Halda áfram í partar.lukels255.com“
// á skjá Google í stað Supabase-slóðarinnar. Auðkenni biðlarans er opinbert.
export const GOOGLE_CLIENT_ID = "979094033986-fe810euugsmcpnhncgkbseuk38tsj4pq.apps.googleusercontent.com";

export const GOOGLE_FLOW_KEY = "partar_google";

export type GoogleFlow = { state: string; nonce: string; link: boolean; next: string; target: string };

function randomHex(bytes = 16): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(s: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

// `link`: tengja Google við núverandi gestaaðgang í stað þess að skrá inn
export async function startGoogle(opts: { link: boolean; next: string; target: string }) {
  const flow: GoogleFlow = { state: randomHex(), nonce: randomHex(), ...opts };
  sessionStorage.setItem(GOOGLE_FLOW_KEY, JSON.stringify(flow));
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: `${window.location.origin}/auth/google`,
    response_type: "id_token",
    scope: "openid email profile",
    // Supabase ber saman SHA-256 af nonce sem við sendum honum við gildið í tókanum
    nonce: await sha256Hex(flow.nonce),
    state: flow.state,
    prompt: "select_account",
  }).toString();
  window.location.assign(url);
}
