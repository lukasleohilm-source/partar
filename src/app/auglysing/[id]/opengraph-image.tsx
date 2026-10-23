import { createClient } from "@supabase/supabase-js";
import { ImageResponse } from "next/og";
import { NUT_PATH } from "@/components/logo";
import { CONDITIONS, KINDS, formatPrice, type Condition, type Kind, type Region } from "@/lib/i18n";
import { placeLabel } from "@/lib/places";

// Deilimynd fyrir Messenger/Facebook: fyrirsögn, verð, staður og merki Partar
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Auglýsing á Pörtum";

type Row = {
  title: string;
  price_isk: number | null;
  kind: Kind;
  condition: Condition;
  region: Region;
  postal_code: string | null;
  status: string;
  listing_images: { color: string | null; sort: number }[];
};

// Sækir aðeins þá stafi sem þarf úr Google Fonts (TrueType, sem ImageResponse styður)
async function loadFont(weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=Inter:wght@${weight}&text=${encodeURIComponent(text)}`)
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const { data } = await supabase
    .from("listings")
    .select("title, price_isk, kind, condition, region, postal_code, status, listing_images(color, sort)")
    .eq("id", id)
    .maybeSingle<Row>();

  const accent = data?.listing_images.sort((a, b) => a.sort - b.sort)[0]?.color ?? "#ea580c";
  const title = data?.title ?? "Partar";
  const price = data ? formatPrice(data.price_isk) : "";
  const meta = data ? [KINDS[data.kind], CONDITIONS[data.condition], placeLabel(data.postal_code, data.region)].join("  ·  ") : "";
  const shownTitle = title.length > 80 ? title.slice(0, 78) + "…" : title;
  const [bold, regular] = await Promise.all([
    loadFont(800, `Partar SELT ${shownTitle} ${price}`),
    loadFont(500, meta),
  ]);
  const fonts = [
    ...(bold ? [{ name: "Inter", data: bold, weight: 800 as const, style: "normal" as const }] : []),
    ...(regular ? [{ name: "Inter", data: regular, weight: 500 as const, style: "normal" as const }] : []),
  ];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#faf9f7", fontFamily: "Inter, sans-serif" }}>
        <div style={{ width: 28, height: "100%", background: accent, display: "flex" }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: "linear-gradient(135deg, #fb923c, #ea580c)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="56" height="56" viewBox="0 0 100 100">
                <path d={NUT_PATH} fill="#fff" fillRule="evenodd" />
              </svg>
            </div>
            <span style={{ fontSize: 40, fontWeight: 800, color: "#1c1917" }}>Partar</span>
            {data?.status === "sold" && (
              <span style={{ marginLeft: 16, fontSize: 28, fontWeight: 800, color: "#fff", background: "#dc2626", padding: "6px 18px", borderRadius: 999 }}>
                SELT
              </span>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ fontSize: title.length > 40 ? 58 : 72, fontWeight: 800, color: "#1c1917", lineHeight: 1.08, letterSpacing: -1.5 }}>
              {shownTitle}
            </div>
            <div style={{ fontSize: 76, fontWeight: 900, color: "#ea580c", letterSpacing: -2 }}>{price}</div>
          </div>
          <div style={{ fontSize: 30, fontWeight: 500, color: "#78716c" }}>{meta}</div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
