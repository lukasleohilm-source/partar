import type { MetadataRoute } from "next";

// Gerir kleift að setja Partar á heimaskjá símans
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Partar – notaðir varahlutir og bílar",
    short_name: "Partar",
    description: "Markaðstorg fyrir notaða varahluti, partabíla og ódýra bíla á Íslandi.",
    lang: "is",
    start_url: "/",
    display: "standalone",
    background_color: "#0f0e0d",
    theme_color: "#0f0e0d",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512m", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
