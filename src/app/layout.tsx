import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { BottomNav } from "@/components/bottom-nav";
import { DesktopHeader } from "@/components/desktop-header";
import { ErrorReporter } from "@/components/error-reporter";
import { ServiceWorker } from "@/components/service-worker";
import { WelcomeGate } from "@/components/welcome-gate";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://partar.lukels255.com"),
  title: "Partar – notaðir varahlutir og bílar",
  description: "Markaðstorg fyrir notaða varahluti, partabíla og ódýra bíla á Íslandi.",
  appleWebApp: { capable: true, title: "Partar", statusBarStyle: "default" },
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
        <DesktopHeader />
        <main className="min-h-dvh pb-24 md:pb-16">{children}</main>
        <BottomNav />
        <ServiceWorker />
        <ErrorReporter />
        <WelcomeGate />
      </body>
    </html>
  );
}
