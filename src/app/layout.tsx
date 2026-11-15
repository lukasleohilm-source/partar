import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Inter } from "next/font/google";
import { BottomNav } from "@/components/bottom-nav";
import { DesktopHeader } from "@/components/desktop-header";
import { ErrorReporter } from "@/components/error-reporter";
import { LangProvider } from "@/components/lang-provider";
import { ServiceWorker } from "@/components/service-worker";
import { SiteFooter } from "@/components/site-footer";
import { WelcomeGate } from "@/components/welcome-gate";
import { INSTALL_LISTENER } from "@/lib/install-script";
import { getT } from "@/lib/lang-server";
import { THEME_COOKIE, type Theme } from "@/lib/lang";
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

async function getTheme(): Promise<Theme> {
  return (await cookies()).get(THEME_COOKIE)?.value === "light" ? "light" : "dark";
}

export async function generateViewport(): Promise<Viewport> {
  const light = (await getTheme()) === "light";
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: light ? "#f7f7f6" : "#08090a",
    colorScheme: light ? "light" : "dark",
  };
}

// Setur útlit úr vafraköku áður en síðan birtist (líka þegar forsíðan kemur úr skyndiminni)
const THEME_SCRIPT = `try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(light|dark)/);document.documentElement.dataset.theme=m?m[1]:"dark"}catch(e){}`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { lang } = await getT();
  const theme = await getTheme();
  return (
    <html lang={lang} data-theme={theme} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: INSTALL_LISTENER }} />
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
