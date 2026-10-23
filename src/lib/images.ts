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

export async function processImage(file: File): Promise<ProcessedImage> {
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
