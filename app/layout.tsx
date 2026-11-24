import type { Metadata, Viewport } from "next";
import { getDict } from "@/lib/lang";
import { LEGAL } from "@/lib/legal";
import Footer from "@/components/Footer";
import NavBar from "@/components/NavBar";
import "./globals.css";

export const metadata: Metadata = {
  title: LEGAL.appName,
  description: "AI video generator — Générateur de vidéos IA",
  manifest: "/manifest.json",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: LEGAL.appName, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#0f172a", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang, t } = await getDict();
  return (
    <html lang={lang}>
      <body>
        <NavBar />
        {children}
        <Footer t={t} />
      </body>
    </html>
  );
}
