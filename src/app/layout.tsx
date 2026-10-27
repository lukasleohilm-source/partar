import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { BottomNav } from "@/components/bottom-nav";
import { DesktopHeader } from "@/components/desktop-header";
import { ErrorReporter } from "@/components/error-reporter";
import { LangProvider } from "@/components/lang-provider";
import { ServiceWorker } from "@/components/service-worker";
import { SiteFooter } from "@/components/site-footer";
import { WelcomeGate } from "@/components/welcome-gate";
import { getT } from "@/lib/lang-server";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    metadataBase: new URL("https://partar.lukels255.com"),
    title: t("Partar – notaðir varahlutir og bílar"),
    description: t("Markaðstorg fyrir notaða varahluti, partabíla og ódýra bíla á Íslandi."),
    appleWebApp: { capable: true, title: "Partar", statusBarStyle: "black-translucent" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#08090a",
  colorScheme: "dark",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { lang } = await getT();
  return (
    <html lang={lang} data-theme="dark">
      <body className={`${inter.variable} antialiased`}>
        <LangProvider lang={lang}>
          <DesktopHeader />
          <main className="min-h-dvh pb-24 md:min-h-[calc(100dvh-4rem)] md:pb-8">{children}</main>
          <SiteFooter />
          <BottomNav />
          <ServiceWorker />
          <ErrorReporter />
          <WelcomeGate />
        </LangProvider>
      </body>
    </html>
  );
}
