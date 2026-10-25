import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { SITE, getSiteUrl } from "@/lib/site";

const display = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: SITE.title,
  description: SITE.description,
  applicationName: SITE.name,
  // Site destiné aux proches : on évite l'indexation par les moteurs de recherche.
  robots: { index: false, follow: false },
  openGraph: {
    title: SITE.title,
    description: SITE.description,
    locale: "fr_FR",
    type: "website",
    images: [{ url: "/images/places/cityhall-facade-1600.webp", width: 1600, height: 1063, alt: "Copenhagen City Hall" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#FFF3F9",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-dvh bg-blush font-sans text-ink antialiased">
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-white focus:px-5 focus:py-3 focus:text-violet-deep focus:shadow-soft"
        >
          Aller au contenu
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
