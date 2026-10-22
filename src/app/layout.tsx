import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { BottomNav } from "@/components/bottom-nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Partar – notaðir varahlutir og bílar",
  description: "Markaðstorg fyrir notaða varahluti, partabíla og ódýra bíla á Íslandi.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ea580c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="is">
      <body className={`${geistSans.variable} antialiased`}>
        <main className="min-h-dvh pb-24">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
