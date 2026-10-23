import { createECDH, randomBytes } from "node:crypto";
// http_ece er óháð útfærsla RFC 8188/8291 (notuð af web-push-safninu)
import ece from "http_ece";
import { describe, expect, it } from "vitest";
import { b64urlDecode, b64urlEncode, encryptPayload, vapidAuthorization, vapidPublicKey } from "@/lib/web-push";

function fakeBrowserSubscription() {
  const ua = createECDH("prime256v1");
  ua.generateKeys();
  const auth = randomBytes(16);
  return {
    ua,
    auth,
    sub: {
      endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
      p256dh: b64urlEncode(new Uint8Array(ua.getPublicKey())),
      auth: b64urlEncode(new Uint8Array(auth)),
    },
  };
}

describe("Web Push dulkóðun (RFC 8291)", () => {
  it("vafri getur afkóðað skilaboðin", async () => {
    const { ua, auth, sub } = fakeBrowserSubscription();
    const message = JSON.stringify({ title: "Ný skilaboð", body: "Er framljósið enn til? ÞÆÐÖ" });
    const body = await encryptPayload(sub, new TextEncoder().encode(message));

    const plain = ece.decrypt(Buffer.from(body), { version: "aes128gcm", privateKey: ua, authSecret: auth });
    expect(plain.toString("utf8")).toBe(message);
  });

  it("hver sending fær nýtt salt og nýjan lykil", async () => {
    const { sub } = fakeBrowserSubscription();
    const a = await encryptPayload(sub, new TextEncoder().encode("x"));
    const b = await encryptPayload(sub, new TextEncoder().encode("x"));
    expect(b64urlEncode(a.slice(0, 16))).not.toBe(b64urlEncode(b.slice(0, 16)));
  });
});

describe("VAPID (RFC 8292)", () => {
  it("býr til gilt ES256 JWT fyrir uppruna push-þjónustunnar", async () => {
    const keys = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])) as CryptoKeyPair;
    const privateJwk = await crypto.subtle.exportKey("jwk", keys.privateKey);
    const header = await vapidAuthorization("https://fcm.googleapis.com/fcm/send/abc", {
      privateJwk,
      subject: "https://partar.lukels255.com",
    });

    const [, jwt, k] = header.match(/^vapid t=([^,]+), k=(.+)$/)!;
    const [h, c, s] = jwt.split(".");
    const claims = JSON.parse(new TextDecoder().decode(b64urlDecode(c)));
    expect(claims.aud).toBe("https://fcm.googleapis.com");
    expect(claims.exp).toBeGreaterThan(Date.now() / 1000);

    const raw = new Uint8Array(await crypto.subtle.exportKey("raw", keys.publicKey));
    expect(k).toBe(b64urlEncode(raw));
    expect(b64urlEncode(vapidPublicKey(privateJwk))).toBe(k);

    const ok = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      keys.publicKey,
      b64urlDecode(s),
      new TextEncoder().encode(`${h}.${c}`),
    );
    expect(ok).toBe(true);
  });
});
