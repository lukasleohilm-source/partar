// Minnkar myndir í vafranum fyrir upphleðslu til að spara gögn í farsímaneti.
// Hver mynd fær tvær stærðir: fulla (1600px) fyrir auglýsingasíðu og smámynd (480px) fyrir spjöld,
// auk ríkjandi litar sem birtist meðan myndin hleðst.

const MAX_SIDE = 1600;
const THUMB_SIDE = 480;
const QUALITY = 0.82;
const THUMB_QUALITY = 0.72;

export type ProcessedImage = {
  source: "new";
  id: string;
  blob: Blob;
  thumb: Blob;
  url: string; // object URL fyrir forskoðun
  width: number;
  height: number;
  color: string; // #rrggbb
  ext: "webp" | "jpg";
};

// Mynd sem er þegar í geymslunni (þegar auglýsingu er breytt)
export type StoredImage = {
  source: "stored";
  id: string;
  path: string;
  thumbPath: string | null;
  url: string;
  width: number | null;
  height: number | null;
  color: string | null;
};

export type PickedImage = ProcessedImage | StoredImage;

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function draw(bitmap: ImageBitmap, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// Meðallitur myndarinnar, reiknaður á 8×8 útgáfu
function averageColor(bitmap: ImageBitmap): string {
  const c = document.createElement("canvas");
  c.width = c.height = 8;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, 8, 8);
  const d = ctx.getImageData(0, 0, 8, 8).data;
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < d.length; i += 4) {
    r += d[i];
    g += d[i + 1];
    b += d[i + 2];
  }
  const n = d.length / 4;
  return "#" + [r, g, b].map((v) => Math.round(v / n).toString(16).padStart(2, "0")).join("");
}

async function encode(canvas: HTMLCanvasElement, quality: number, ext: ProcessedImage["ext"]) {
  const blob = await toBlob(canvas, ext === "webp" ? "image/webp" : "image/jpeg", quality);
  if (!blob) throw new Error("image_encode_failed");
  return blob;
}

export async function processImage(file: Blob): Promise<ProcessedImage> {
  // imageOrientation: "from-image" snýr myndum úr síma rétt (EXIF)
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const full = draw(bitmap, MAX_SIDE);
  const small = draw(bitmap, THUMB_SIDE);
  const color = averageColor(bitmap);
  bitmap.close();

  // Eldri Safari getur ekki búið til WebP og skilar þá PNG; notum JPEG í staðinn
  let ext: ProcessedImage["ext"] = "webp";
  let blob = await toBlob(full, "image/webp", QUALITY);
  if (!blob || blob.type !== "image/webp") {
    ext = "jpg";
    blob = await encode(full, QUALITY, ext);
  }
  const thumb = await encode(small, THUMB_QUALITY, ext);

  return {
    source: "new",
    id: crypto.randomUUID(),
    blob,
    thumb,
    url: URL.createObjectURL(blob),
    width: full.width,
    height: full.height,
    color,
    ext,
  };
}

// ===== Myndabætur (✨ í Selja-forminu) =====

function loadCanvas(bitmap: ImageBitmap) {
  const canvas = draw(bitmap, MAX_SIDE);
  return { canvas, ctx: canvas.getContext("2d", { willReadFrequently: true })! };
}

// Sjálfvirk birta og litir: hver litrás teygð frá 0,5% til 99,5% (lagar líka gulleita
// bílskúrsbirtu), svo örlítið meiri mettun. Hámark á mögnun svo dökkar myndir verði ekki grófar.
export async function enhanceImage(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const { canvas, ctx } = loadCanvas(bitmap);
  bitmap.close();
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  const n = d.length / 4;
  const lo: number[] = [];
  const gain: number[] = [];
  for (let c = 0; c < 3; c++) {
    const hist = new Uint32Array(256);
    for (let i = c; i < d.length; i += 4) hist[d[i]]++;
    let acc = 0;
    let low = 0;
    let high = 255;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc > n * 0.005) {
        low = v;
        break;
      }
    }
    acc = 0;
    for (let v = 255; v >= 0; v--) {
      acc += hist[v];
      if (acc > n * 0.005) {
        high = v;
        break;
      }
    }
    lo.push(low);
    gain.push(Math.min(2.2, 255 / Math.max(1, high - low)));
  }
  // Meðalbirta eftir teygingu; dökkar myndir lýstar með gamma (aðeins lýst, aldrei dekkt)
  let sum = 0;
  for (let i = 0; i < d.length; i += 16) {
    sum += 0.299 * (d[i] - lo[0]) * gain[0] + 0.587 * (d[i + 1] - lo[1]) * gain[1] + 0.114 * (d[i + 2] - lo[2]) * gain[2];
  }
  const mean = Math.min(0.95, Math.max(0.05, sum / (n / 4) / 255));
  const gamma = Math.min(1, Math.max(0.55, Math.log(0.5) / Math.log(mean)));
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) lut[v] = 255 * Math.pow(v / 255, gamma);

  // Mildað: 80% leiðrétting, 20% upprunaleg, svo myndin haldi náttúrulegum blæ
  const STRENGTH = 0.8;
  const SAT = 1.1;
  for (let i = 0; i < d.length; i += 4) {
    let r = lut[Math.max(0, Math.min(255, Math.round((d[i] - lo[0]) * gain[0])))];
    let g = lut[Math.max(0, Math.min(255, Math.round((d[i + 1] - lo[1]) * gain[1])))];
    let b = lut[Math.max(0, Math.min(255, Math.round((d[i + 2] - lo[2]) * gain[2])))];
    const grey = 0.299 * r + 0.587 * g + 0.114 * b;
    r = grey + (r - grey) * SAT;
    g = grey + (g - grey) * SAT;
    b = grey + (b - grey) * SAT;
    d[i] = d[i] + (r - d[i]) * STRENGTH;
    d[i + 1] = d[i + 1] + (g - d[i + 1]) * STRENGTH;
    d[i + 2] = d[i + 2] + (b - d[i + 2]) * STRENGTH;
  }
  ctx.putImageData(img, 0, 0);
  return encode(canvas, 0.92, "jpg");
}

// Hlutur (gegnsær PNG frá Cloudflare) settur á hvítan flöt með mjúkum skugga, eins og í vefverslun
export async function onWhiteBackground(cutout: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(cutout);
  // Klippa burt gegnsæja jaðra svo hluturinn verði fyrir miðju
  const probe = document.createElement("canvas");
  probe.width = bitmap.width;
  probe.height = bitmap.height;
  const pctx = probe.getContext("2d", { willReadFrequently: true })!;
  pctx.drawImage(bitmap, 0, 0);
  const a = pctx.getImageData(0, 0, probe.width, probe.height).data;
  let minX = probe.width, minY = probe.height, maxX = 0, maxY = 0;
  for (let y = 0; y < probe.height; y++) {
    for (let x = 0; x < probe.width; x++) {
      if (a[(y * probe.width + x) * 4 + 3] > 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX || maxY <= minY) throw new Error("no_subject");
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;

  // 4:3 flötur með 10% spássíu
  const outW = 1600;
  const outH = 1200;
  const scale = Math.min((outW * 0.8) / w, (outH * 0.8) / h);
  const dw = w * scale;
  const dh = h * scale;
  const dx = (outW - dw) / 2;
  const dy = (outH - dh) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outW, outH);
  // Mjúkur skuggi undir hlutnum
  const shadow = ctx.createRadialGradient(outW / 2, dy + dh, 0, outW / 2, dy + dh, dw * 0.55);
  shadow.addColorStop(0, "rgba(0,0,0,0.18)");
  shadow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save();
  ctx.translate(outW / 2, dy + dh);
  ctx.scale(1, 0.12);
  ctx.translate(-outW / 2, -(dy + dh));
  ctx.fillStyle = shadow;
  ctx.fillRect(0, dy + dh - dw * 0.55, outW, dw * 1.1);
  ctx.restore();
  ctx.drawImage(bitmap, minX, minY, w, h, dx, dy, dw, dh);
  bitmap.close();
  return encode(canvas, 0.92, "jpg");
}

// Sendir mynd í gegnum Cloudflare til að fjarlægja bakgrunninn og setur hlutinn á hvítan flöt.
// Myndinni er hlaðið tímabundið upp í eigin möppu notandans og eytt strax á eftir.
export async function removeBackground(blob: Blob): Promise<Blob> {
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not_signed_in");

  const path = `${user.id}/tmp/${crypto.randomUUID()}.jpg`;
  const bucket = supabase.storage.from("listing-images");
  const { error } = await bucket.upload(path, blob, { contentType: blob.type || "image/jpeg" });
  if (error) throw error;
  try {
    const res = await fetch("/api/myndir/bakgrunnur", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path }),
    });
    if (!res.ok) throw new Error(`segment_failed_${res.status}`);
    return await onWhiteBackground(await res.blob());
  } finally {
    void bucket.remove([path]);
  }
}
