import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { BottomNav } from "@/components/bottom-nav";
import { DesktopHeader } from "@/components/desktop-header";
import { ErrorReporter } from "@/components/error-reporter";
import { LangProvider } from "@/components/lang-provider";
import { ServiceWorker } from "@/components/service-worker";
import { WelcomeGate } from "@/components/welcome-gate";
import { getT } from "@/lib/lang-server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    metadataBase: new URL("https://partar.lukels255.com"),
    title: t("Partar – notaðir varahlutir og bílar"),
    description: t("Markaðstorg fyrir notaða varahluti, partabíla og ódýra bíla á Íslandi."),
    appleWebApp: { capable: true, title: "Partar", statusBarStyle: "default" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ea580c",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { lang } = await getT();
  return (
    <html lang={lang}>
      <body className={`${geistSans.variable} antialiased`}>
        <LangProvider lang={lang}>
          <DesktopHeader />
          <main className="min-h-dvh pb-24 md:pb-16">{children}</main>
          <BottomNav />
          <ServiceWorker />
          <ErrorReporter />
          <WelcomeGate />
        </LangProvider>
      </body>
    </html>
  );
}
