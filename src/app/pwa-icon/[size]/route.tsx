import { ImageResponse } from "next/og";
import { AppIcon } from "@/components/app-icon";

// /pwa-icon/192, /pwa-icon/512 og /pwa-icon/512m (maskable)
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const raw = (await params).size;
  const maskable = raw.endsWith("m");
  const size = Number(maskable ? raw.slice(0, -1) : raw);
  if (![192, 512].includes(size)) return new Response("Not found", { status: 404 });
  return new ImageResponse(<AppIcon size={size} maskable={maskable} />, {
    width: size,
    height: size,
    headers: { "Cache-Control": "public, max-age=604800" },
  });
}
