import { Wrench } from "lucide-react";
import { thumbUrl, type ImageRef } from "@/lib/listings";

// Smámynd með ríkjandi lit myndarinnar sem bakgrunn meðan hún hleðst
export function Thumb({
  image,
  className = "",
  eager = false,
}: {
  image: ImageRef | null;
  className?: string;
  eager?: boolean;
}) {
  if (!image) {
    return (
      <div className={`flex items-center justify-center bg-stone-200 text-stone-400 ${className}`}>
        <Wrench size={22} aria-hidden />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- myndir þegar minnkaðar við upphleðslu
    <img
      src={thumbUrl(image)}
      alt=""
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      style={{ backgroundColor: image.color ?? undefined }}
      className={`object-cover ${image.color ? "" : "bg-stone-200"} ${className}`}
    />
  );
}
