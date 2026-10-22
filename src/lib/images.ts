// Minnkar myndir í vafranum fyrir upphleðslu til að spara gögn í farsímaneti.

const MAX_SIDE = 1600;
const QUALITY = 0.82;

export type ProcessedImage = {
  id: string;
  blob: Blob;
  url: string; // object URL fyrir forskoðun
  width: number;
  height: number;
  ext: "webp" | "jpg";
};

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

export async function processImage(file: File): Promise<ProcessedImage> {
  // imageOrientation: "from-image" snýr myndum úr síma rétt (EXIF)
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // Eldri Safari getur ekki búið til WebP og skilar þá PNG; notum JPEG í staðinn
  let blob = await toBlob(canvas, "image/webp");
  let ext: ProcessedImage["ext"] = "webp";
  if (!blob || blob.type !== "image/webp") {
    blob = await toBlob(canvas, "image/jpeg");
    ext = "jpg";
  }
  if (!blob) throw new Error("image_encode_failed");

  return { id: crypto.randomUUID(), blob, url: URL.createObjectURL(blob), width, height, ext };
}
