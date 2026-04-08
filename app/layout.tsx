import type { Metadata, Viewport } from "next";
import "./globals.css";

import Header      from "@/components/layout/Header";
import Footer      from "@/components/layout/Footer";
import ChatWidget  from "@/components/bot/ChatWidget";
import { IntroProvider } from "@/context/IntroContext";
import IntroScreen from "@/components/intro/IntroScreen";
import { CartProvider } from "@/context/CartContext";

const BASE_URL = "https://milk-bebe.fr";

// ─── Viewport ─────────────────────────────────────────────────────────────────
export const viewport: Viewport = {
  themeColor:   "#1a1410",
  colorScheme:  "dark",
  width:        "device-width",
  initialScale: 1,
  maximumScale: 5,
};

// ─── Metadata ─────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default:  "M!LK — Bodies, Pyjamas, Gigoteuses & Langes nourrisson bambou premium | 0-6 mois",
    template: "%s | M!LK — Essentiels bébé bambou",
  },

  description:
    "Bodies, pyjamas, gigoteuses et langes pour nourrissons 0 à 6 mois en bambou certifié OEKO-TEX. Ultra-doux, thermorégulateur, antibactérien. Idéal pour peaux sensibles, eczéma, irritations. Parfait cadeau de naissance, trousseau maternité, baby shower. Livraison offerte dès 60€.",

  keywords: [
    // Bodies
    "body nourrisson bambou", "body bébé naissance bambou", "body bébé 0 3 mois bambou",
    "body bébé nouveau né bambou", "body bébé 0 à 6 mois", "body bébé manches longues bambou",
    "body bébé manches courtes bambou", "body bébé prématuré bambou",
    "body bébé certifié OEKO-TEX", "body bébé peau sensible", "body bébé thermorégulateur",
    "body nourrisson 1 mois", "body nourrisson 3 mois", "body bébé anti-irritation",
    // Pyjamas
    "pyjama nourrisson bambou", "pyjama bébé naissance bambou", "pyjama bébé 0 3 mois bambou",
    "pyjama bébé zip bambou", "pyjama bébé fermeture éclair", "pyjama nourrisson doux peau sensible",
    "pyjama bébé OEKO-TEX", "grenouillère bébé bambou", "dors bien bébé naissance bambou",
    "pyjama bébé prématuré", "pyjama bébé antibactérien naturel",
    // Gigoteuses
    "gigoteuse nourrisson bambou", "gigoteuse bébé naissance bambou", "gigoteuse bébé 0 3 mois bambou",
    "gigoteuse bébé thermorégulateur", "gigoteuse bébé OEKO-TEX", "gigoteuse légère nourrisson",
    "turbulette bébé bambou", "turbulette nourrisson naissance", "sac de couchage bébé bambou",
    "nid d'ange bébé bambou", "gigoteuse TOG bambou nourrisson",
    // Langes
    "lange nourrisson bambou", "lange bébé doux naissance", "lange bébé 0 3 mois",
    "lange emmaillotage nourrisson", "lange bambou certifié OEKO-TEX", "swaddle bébé bambou",
    // Général
    "vêtements nourrisson bambou", "vêtements bébé naissance bambou", "vêtements bébé 0 3 mois bambou",
    "vêtements bébé peau sensible", "vêtements bébé thermorégulateur", "vêtements bébé OEKO-TEX",
    "bambou nourrisson OEKO-TEX", "tissu bambou nourrisson", "layette bambou nourrisson",
    "layette bébé 0 3 mois bambou", "essentiels bébé bambou",
    // Problèmes spécifiques
    "vêtements bébé eczéma", "vêtements bébé peau atopique", "vêtements bébé surchauffe nuit",
    "vêtements bébé irritations cutanées", "vêtements bébé anti-allergie",
    // Trousseau & maternité
    "trousseau naissance bambou", "trousseau maternité bébé bambou", "valise maternité bébé bambou",
    "liste naissance bambou", "kit naissance bambou", "coffret naissance bambou",
    // Cadeaux
    "cadeau naissance bambou", "cadeau naissance original bambou", "cadeau baby shower bambou",
    "coffret cadeau bébé bambou", "meilleur cadeau naissance 2025", "idée cadeau naissance bambou",
    "cadeau naissance OEKO-TEX", "cadeau futur parents vêtements bébé",
    // Futurs parents
    "future maman vêtements bébé bambou", "habiller nouveau né bambou",
    "comment habiller nourrisson bambou", "habiller bébé nuit bambou",
    "meilleur pyjama nourrisson avis", "meilleure gigoteuse nourrisson avis",
    "meilleur body nourrisson avis", "acheter body nourrisson bambou",
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
  },

  verification: {
    // google: "TON_CODE_GOOGLE_SEARCH_CONSOLE",
  },
};

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        {/* Favicons */}
        <link rel="icon"             href="/favicon.ico"          sizes="any" />
        <link rel="icon"             href="/favicon-32x32.png"    type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest"         href="/manifest.json" />

        {/* Préconnexions pour accélérer le chargement */}
        <link rel="preconnect"  href="https://ntkqmnenczltlwplswka.supabase.co" />
        <link rel="dns-prefetch" href="https://ntkqmnenczltlwplswka.supabase.co" />
        <link rel="preconnect"  href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      <body>
        <CartProvider>
          <IntroProvider>
            <IntroScreen />
            <Header />
            <main>{children}</main>
            <Footer />
            <ChatWidget />
          </IntroProvider>
        </CartProvider>
      </body>
    </html>
  );
}