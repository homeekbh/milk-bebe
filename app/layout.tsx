import type { Metadata, Viewport } from "next";
import "./globals.css";
import Script from "next/script";

import Header        from "@/components/layout/Header";
import Footer        from "@/components/layout/Footer";
import ChatWidget    from "@/components/bot/ChatWidget";
import { IntroProvider }  from "@/context/IntroContext";
import IntroScreen   from "@/components/intro/IntroScreen";
import { CartProvider }   from "@/context/CartContext";
import { LangProvider }   from "@/context/LangContext";
import { AuthProvider }   from "@/context/AuthContext";
import PopupBienvenue from "@/components/PopupBienvenue";
import CookieBanner      from "@/components/CookieBanner";
import ExitIntentPopup     from "@/components/ExitIntentPopup";
import { WishlistProvider } from "@/context/WishlistContext";

const BASE_URL   = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";
const META_PIXEL = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";

// ── Viewport ─────────────────────────────────────────────────────────────────
export const viewport: Viewport = {
  themeColor:   "#2a2018",
  colorScheme:  "dark",
  width:        "device-width",
  initialScale: 1,
  maximumScale: 5,
};

// ── SEO Metadata ──────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default:  "M!LK — Bodies, Pyjamas, Gigoteuses & Langes nourrisson bambou | OEKO-TEX | 0-6 mois",
    template: "%s | M!LK — Essentiels bébé bambou OEKO-TEX",
  },

  description:
    "Bodies, pyjamas, gigoteuses et langes nourrisson 0-6 mois en bambou certifié OEKO-TEX Standard 100. 3× plus doux que le coton, thermorégulateur, antibactérien. Idéal peaux sensibles, eczéma. Cadeau naissance parfait. Livraison offerte dès 60€. Marque française.",

  keywords: [
    // Produits principaux
    "body nourrisson bambou", "body bébé naissance bambou", "body bébé 0 3 mois bambou",
    "body bébé nouveau né bambou", "body bébé 0 6 mois", "body bébé manches longues bambou",
    "body bébé certifié OEKO-TEX", "body bébé peau sensible", "body bébé thermorégulateur",
    "pyjama nourrisson bambou", "pyjama bébé naissance bambou", "pyjama bébé 0 3 mois bambou",
    "pyjama bébé zip bambou", "grenouillère bébé bambou", "dors bien bébé naissance bambou",
    "gigoteuse nourrisson bambou", "gigoteuse bébé naissance bambou", "gigoteuse bébé 0 3 mois",
    "turbulette bébé bambou", "sac de couchage bébé bambou", "nid ange bébé bambou",
    "lange nourrisson bambou", "lange emmaillotage nourrisson", "swaddle bébé bambou",
    "bonnet bébé bambou", "bonnet nourrisson bambou",
    // Intentions d'achat
    "vêtements nourrisson bambou", "vêtements bébé naissance bambou", "vêtements bébé 0 3 mois",
    "vêtements bébé peau sensible", "vêtements bébé OEKO-TEX", "bambou nourrisson OEKO-TEX",
    "layette bambou nourrisson", "essentiels bébé bambou premium",
    "vêtements bébé eczéma", "vêtements bébé peau atopique", "vêtements bébé surchauffe nuit",
    // Cadeaux et occasions
    "trousseau naissance bambou", "valise maternité bébé bambou", "kit naissance bambou",
    "cadeau naissance bambou", "cadeau baby shower bambou", "meilleur cadeau naissance 2025 2026",
    "cadeau naissance original", "idée cadeau bébé bambou",
    // Marque et localisation
    "future maman vêtements bébé bambou", "habiller nouveau né bambou",
    "boutique vêtements bébé bambou France", "marque française vêtements bébé bambou",
    "M!LK bébé", "milkbebe", "milk bébé bambou",
    // Longue traîne
    "comment habiller nourrisson nuit bambou", "bébé transpire nuit vêtement bambou",
    "vêtement bébé anti irritation bambou", "meilleure matière vêtement nourrisson",
  ],

  authors:  [{ name: "M!LK", url: BASE_URL }],
  creator:  "M!LK",
  publisher:"M!LK",

  // ── Open Graph ──────────────────────────────────────────────────────────────
  openGraph: {
    type:        "website",
    locale:      "fr_FR",
    url:         BASE_URL,
    siteName:    "M!LK",
    title:       "M!LK — Bodies, Pyjamas, Gigoteuses & Langes nourrisson bambou | OEKO-TEX",
    description: "Vêtements nourrisson 0-6 mois en bambou certifié OEKO-TEX. 3× plus doux que le coton, thermorégulateur, antibactérien. Cadeau naissance parfait. Livraison offerte dès 60€.",
    images: [{
      url:    "/images/home/milk_banner_artisan.jpg",
      width:  1200,
      height: 630,
      alt:    "M!LK — Bodies, pyjamas, gigoteuses et langes nourrisson en bambou premium certifié OEKO-TEX",
    }],
  },

  // ── Twitter / X ─────────────────────────────────────────────────────────────
  twitter: {
    card:        "summary_large_image",
    title:       "M!LK — Bodies, Pyjamas, Gigoteuses nourrisson bambou | OEKO-TEX | 0-6 mois",
    description: "Vêtements nourrisson 0-6 mois en bambou certifié OEKO-TEX. Ultra-doux, thermorégulateur, antibactérien. Cadeau de naissance parfait.",
    images:      ["/images/home/milk_banner_artisan.jpg"],
  },

  // ── Indexation ──────────────────────────────────────────────────────────────
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

  // ── Canoniques et hreflang ──────────────────────────────────────────────────
  alternates: {
    canonical: `${BASE_URL}/`,
    languages: {
      "fr-FR": `${BASE_URL}/`,
      "en":    `${BASE_URL}/en`,
      "it":    `${BASE_URL}/it`,
      "hu":    `${BASE_URL}/hu`,
    },
  },

  // ── App / PWA ────────────────────────────────────────────────────────────────
  applicationName: "M!LK",
  manifest:        "/manifest.json",
  appleWebApp: {
    capable:        true,
    statusBarStyle: "black-translucent",
    title:          "M!LK",
  },

  // ── Vérification Search Console ──────────────────────────────────────────────
  // Décommenter et renseigner après vérification Google Search Console :
  // verification: {
  //   google: "VOTRE_CODE_VERIFICATION_GSC",
  // },
};

// ── JSON-LD Schema.org ────────────────────────────────────────────────────────
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id":   `${BASE_URL}/#organization`,
      name:    "M!LK",
      url:     BASE_URL,
      logo: {
        "@type":       "ImageObject",
        url:           `${BASE_URL}/images/home/milk_banner_artisan.jpg`,
        width:         "200",
        height:        "200",
      },
      description: "Marque française d'essentiels bébé en bambou certifié OEKO-TEX Standard 100 pour nourrissons 0-6 mois.",
      sameAs: [
        "https://www.instagram.com/milkbebe.fr",
      ],
      contactPoint: {
        "@type":             "ContactPoint",
        email:               "contact@milkbebe.fr",
        contactType:         "customer service",
        availableLanguage:   "French",
      },
    },
    {
      "@type":    "WebSite",
      "@id":      `${BASE_URL}/#website`,
      url:        BASE_URL,
      name:       "M!LK",
      publisher:  { "@id": `${BASE_URL}/#organization` },
      potentialAction: {
        "@type":       "SearchAction",
        target:        { "@type": "EntryPoint", urlTemplate: `${BASE_URL}/recherche?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type":        "Store",
      "@id":          `${BASE_URL}/#store`,
      name:           "M!LK",
      url:            BASE_URL,
      priceRange:     "€€",
      currenciesAccepted: "EUR",
      paymentAccepted:    "Credit Card, PayPal",
      areaServed:     ["FR", "BE", "CH", "LU", "MC"],
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name:    "Essentiels bébé bambou",
        itemListElement: [
          { "@type": "OfferCatalog", name: "Bodies nourrisson bambou" },
          { "@type": "OfferCatalog", name: "Pyjamas nourrisson bambou" },
          { "@type": "OfferCatalog", name: "Gigoteuses nourrisson bambou" },
          { "@type": "OfferCatalog", name: "Accessoires nourrisson bambou" },
        ],
      },
    },
  ],
};

// ── Layout ────────────────────────────────────────────────────────────────────
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        {/* Favicons */}
        <link rel="icon"             href="/favicon.svg"          type="image/svg+xml" />
        <link rel="icon"             href="/favicon.ico"          sizes="any" />
        <link rel="icon"             href="/favicon-32x32.png"    type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest"         href="/manifest.json" />

        {/* Preconnect performances */}
        <link rel="preconnect"   href="https://ntkqmnenczltlwplswka.supabase.co" />
        <link rel="dns-prefetch" href="https://ntkqmnenczltlwplswka.supabase.co" />
        <link rel="preconnect"   href="https://js.stripe.com" />
        <link rel="preconnect"   href="https://connect.facebook.net" />

        {/* JSON-LD Schema.org */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>

      <body>
        {/* ── Google Analytics 4 ── */}
        {process.env.NEXT_PUBLIC_GA4_ID && (
          <>
            <Script
              id="ga4"
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA4_ID}`}
            />
            <Script
              id="ga4-init"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA4_ID}', { page_path: window.location.pathname });
                `,
              }}
            />
          </>
        )}

        {/* ── Meta Pixel (Facebook / Instagram Ads) ── */}
        {META_PIXEL && (
          <>
            <Script
              id="meta-pixel"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  !function(f,b,e,v,n,t,s){
                    if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                    n.queue=[];t=b.createElement(e);t.async=!0;
                    t.src=v;s=b.getElementsByTagName(e)[0];
                    s.parentNode.insertBefore(t,s)}(window,document,'script',
                    'https://connect.facebook.net/en_US/fbevents.js');
                  fbq('init', '${META_PIXEL}');
                  fbq('track', 'PageView');
                `,
              }}
            />
            <noscript>
              <img
                height="1"
                width="1"
                style={{ display: "none" }}
                src={`https://www.facebook.com/tr?id=${META_PIXEL}&ev=PageView&noscript=1`}
                alt=""
              />
            </noscript>
          </>
        )}

        <WishlistProvider>
          <AuthProvider>
          <CartProvider>
            <LangProvider>
              <IntroProvider>
                <IntroScreen />
                <PopupBienvenue />
                <Header />
                <main>{children}</main>
                <Footer />
                <ChatWidget />
                <CookieBanner />
                <ExitIntentPopup />
              </IntroProvider>
            </LangProvider>
          </CartProvider>
        </AuthProvider>
          </WishlistProvider>
      </body>
    </html>
  );
}