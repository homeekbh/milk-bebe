import type { Metadata, Viewport } from "next";
import "./globals.css";

import Header      from "@/components/layout/Header";
import Footer      from "@/components/layout/Footer";
import ChatWidget  from "@/components/bot/ChatWidget";
import { IntroProvider } from "@/context/IntroContext";
import IntroScreen from "@/components/intro/IntroScreen";
import { CartProvider } from "@/context/CartContext";
import { LangProvider } from "@/context/LangContext";
import { AuthProvider } from "@/context/AuthContext";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://milk-bebe.vercel.app";

export const viewport: Viewport = {
  themeColor:   "#2a2018",
  colorScheme:  "dark",
  width:        "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default:  "M!LK — Bodies, Pyjamas, Gigoteuses & Langes nourrisson bambou premium | 0-6 mois",
    template: "%s | M!LK — Essentiels bébé bambou",
  },
  description:
    "Bodies, pyjamas, gigoteuses et langes pour nourrissons 0 à 6 mois en bambou certifié OEKO-TEX. Ultra-doux, thermorégulateur, antibactérien. Idéal pour peaux sensibles, eczéma, irritations. Parfait cadeau de naissance, trousseau maternité, baby shower. Livraison offerte dès 60€.",
  keywords: [
    "body nourrisson bambou", "body bébé naissance bambou", "body bébé 0 3 mois bambou",
    "body bébé nouveau né bambou", "body bébé 0 à 6 mois", "body bébé manches longues bambou",
    "body bébé certifié OEKO-TEX", "body bébé peau sensible", "body bébé thermorégulateur",
    "pyjama nourrisson bambou", "pyjama bébé naissance bambou", "pyjama bébé 0 3 mois bambou",
    "pyjama bébé zip bambou", "grenouillère bébé bambou", "dors bien bébé naissance bambou",
    "gigoteuse nourrisson bambou", "gigoteuse bébé naissance bambou", "gigoteuse bébé 0 3 mois bambou",
    "turbulette bébé bambou", "sac de couchage bébé bambou", "nid d'ange bébé bambou",
    "lange nourrisson bambou", "lange emmaillotage nourrisson", "swaddle bébé bambou",
    "vêtements nourrisson bambou", "vêtements bébé naissance bambou", "vêtements bébé 0 3 mois bambou",
    "vêtements bébé peau sensible", "vêtements bébé OEKO-TEX", "bambou nourrisson OEKO-TEX",
    "layette bambou nourrisson", "essentiels bébé bambou",
    "vêtements bébé eczéma", "vêtements bébé peau atopique", "vêtements bébé surchauffe nuit",
    "trousseau naissance bambou", "valise maternité bébé bambou", "kit naissance bambou",
    "cadeau naissance bambou", "cadeau baby shower bambou", "meilleur cadeau naissance 2025",
    "future maman vêtements bébé bambou", "habiller nouveau né bambou",
    "boutique vêtements bébé bambou France", "marque française vêtements bébé bambou",
  ],
  authors: [{ name: "M!LK", url: BASE_URL }],
  openGraph: {
    type:        "website",
    locale:      "fr_FR",
    url:         BASE_URL,
    siteName:    "M!LK",
    title:       "M!LK — Bodies, Pyjamas, Gigoteuses & Langes nourrisson bambou premium",
    description: "Vêtements nourrisson 0 à 6 mois en bambou certifié OEKO-TEX. Ultra-doux pour peaux sensibles, thermorégulateur, antibactérien. Parfait cadeau de naissance. Livraison offerte dès 60€.",
    images: [{
      url:    "/images/hero/hero-papa-bebe.png",
      width:  1200,
      height: 630,
      alt:    "M!LK — Bodies, pyjamas, gigoteuses et langes nourrisson en bambou premium certifié OEKO-TEX",
    }],
  },
  twitter: {
    card:        "summary_large_image",
    title:       "M!LK — Bodies, Pyjamas, Gigoteuses nourrisson bambou | 0-6 mois | OEKO-TEX",
    description: "Vêtements nourrisson 0 à 6 mois en bambou certifié OEKO-TEX. Ultra-doux, thermorégulateur, antibactérien. Cadeau de naissance parfait.",
    images:      ["/images/hero/hero-papa-bebe.png"],
  },
  robots: {
    index:  true,
    follow: true,
    googleBot: {
      index:               true,
      follow:              true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet":       -1,
    },
  },
  alternates: {
    canonical: BASE_URL,
    languages: {
      "fr": `${BASE_URL}/`,
      "en": `${BASE_URL}/en`,
      "it": `${BASE_URL}/it`,
      "hu": `${BASE_URL}/hu`,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        {/* ✅ Favicon SVG — modern browsers */}
        <link rel="icon"             href="/favicon.svg"         type="image/svg+xml" />
        {/* Fallback ICO — vieux browsers */}
        <link rel="icon"             href="/favicon.ico"         sizes="any" />
        {/* PNG pour les navigateurs qui ne supportent pas SVG */}
        <link rel="icon"             href="/favicon-32x32.png"   type="image/png" sizes="32x32" />
        {/* Apple touch icon */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* PWA manifest */}
        <link rel="manifest"         href="/manifest.json" />
        {/* Preconnect Supabase */}
        <link rel="preconnect"       href="https://ntkqmnenczltlwplswka.supabase.co" />
        <link rel="dns-prefetch"     href="https://ntkqmnenczltlwplswka.supabase.co" />
      </head>
      <body>
        <AuthProvider>
          <CartProvider>
            <LangProvider>
              <IntroProvider>
                <IntroScreen />
                <Header />
                <main>{children}</main>
                <Footer />
                <ChatWidget />
              </IntroProvider>
            </LangProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}