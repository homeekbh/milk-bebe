import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { getAlternates } from "@/i18n/seo";

import Header        from "@/components/layout/Header";
import Footer        from "@/components/layout/Footer";
import ChatWidget    from "@/components/bot/ChatWidget";
import { IntroProvider }  from "@/context/IntroContext";
import IntroScreen   from "@/components/intro/IntroScreen";
import { CartProvider }   from "@/context/CartContext";
import { AuthProvider }   from "@/context/AuthContext";
import PopupBienvenue from "@/components/PopupBienvenue";
import CookieBanner      from "@/components/CookieBanner";
import ExitIntentPopup     from "@/components/ExitIntentPopup";
import PromoSticker        from "@/components/promo/PromoSticker";
import { WishlistProvider } from "@/context/WishlistContext";
import GTMScript, { GTMNoScript } from "@/components/analytics/GTMScript";
import PageTracker from "@/components/analytics/PageTracker";
import MerchantBadge from "@/components/analytics/MerchantBadge";

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

// ── SEO Metadata (par locale) ─────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
  metadataBase: new URL(BASE_URL),

  title: {
    default:  "M!LK — Bodies, Pyjamas, Gigoteuses & Langes nourrisson bambou | OEKO-TEX | 0-6 mois",
    template: "%s | M!LK — Essentiels bébé bambou OEKO-TEX",
  },

  description:
    "Bodies, pyjamas, gigoteuses et langes nourrisson 0-6 mois en bambou certifié OEKO-TEX Standard 100. 3× plus doux que le coton, thermorégulateur, antibactérien. Idéal peaux sensibles, eczéma. Cadeau naissance parfait. Livraison offerte dès 60€. Marque française.",

  keywords: [
    // PRODUITS CORE
    "pyjama bébé", "body bébé", "body naissance", "grenouillère bébé",
    "vêtement bébé", "vêtement naissance", "layette bébé", "pyjama naissance",
    "combinaison bébé", "pyjama zip bébé", "grenouillère zip bébé",
    "body manches longues bébé", "body nouveau-né", "body bébé 0-3 mois",
    "pyjama bébé 0-3 mois", "pyjama bébé 3-6 mois", "body bébé 3-6 mois",
    "gigoteuse bébé", "turbulette bébé", "gigoteuse naissance",
    "sac de couchage bébé", "nid d'ange bébé", "gigoteuse 0-6 mois",
    "lange bébé", "emmaillotage bébé", "mousseline bébé",
    "bonnet naissance", "nœud tête bébé", "bandeau bébé",
    "vêtement nourrisson", "tenue naissance", "habit bébé",
    "combinaison naissance", "grenouillère naissance", "pyjama nourrisson",
    // CADEAUX ET LISTES DE NAISSANCE
    "cadeau naissance", "cadeau naissance original", "cadeau naissance bébé",
    "idée cadeau naissance", "idée cadeau bébé", "coffret cadeau naissance",
    "box cadeau naissance", "cadeau naissance fille", "cadeau naissance garçon",
    "cadeau naissance pas cher", "cadeau naissance tendance",
    "cadeau naissance utile", "cadeau naissance pratique",
    "cadeau naissance luxe", "cadeau naissance premium",
    "cadeau naissance personnalisé", "cadeau naissance made in France",
    "liste de naissance", "liste de naissance bébé", "liste naissance originale",
    "que mettre sur liste de naissance", "idée liste de naissance",
    "liste naissance complète", "liste naissance utile",
    "trousseau naissance", "trousseau maternité bébé",
    "what to put on baby registry France",
    // FUTURE MAMAN / JEUNE MAMAN
    "cadeau future maman", "cadeau jeune maman", "cadeau maman bébé",
    "idée cadeau jeune maman", "idée cadeau future maman",
    "cadeau maman nourrisson", "coffret maman bébé",
    "cadeau naissance pour maman", "cadeau post-partum",
    "cadeau maman nouvelle naissance", "kit naissance bébé",
    "box maman bébé", "coffret naissance luxe",
    "cadeau shower bébé", "baby shower cadeau",
    "baby shower idée cadeau", "idée baby shower",
    "cadeau grossesse", "cadeau fin grossesse",
    // QUALITÉ ET MATIÈRES
    "vêtement bébé OEKO-TEX", "body bébé OEKO-TEX",
    "pyjama bébé certifié", "vêtement bébé sans produit chimique",
    "vêtement bébé peau sensible", "body bébé hypoallergénique",
    "pyjama bébé thermorégulateur", "vêtement bébé antibactérien",
    "body bambou bébé", "pyjama bambou bébé", "gigoteuse bambou bébé",
    "vêtement bambou bébé", "bambou OEKO-TEX bébé",
    "vêtement bébé naturel", "vêtement bébé écologique",
    "vêtement bébé bio", "body bébé doux", "pyjama bébé ultra doux",
    "vêtement bébé qualité", "vêtement bébé premium", "vêtement bébé luxe",
    // FONCTIONNALITÉS
    "body bébé sans étiquette", "grenouillère double zip bébé",
    "pyjama bébé moufles intégrées", "grenouillère pieds intégrés",
    "body bébé pression", "pyjama bébé facile à enfiler",
    "grenouillère bébé facile change", "body bébé extensible",
    "vêtement bébé souple", "pyjama bébé confortable",
    // STYLE ET TENDANCE
    "vêtement bébé tendance", "vêtement bébé graphique",
    "vêtement bébé original", "vêtement bébé design",
    "vêtement bébé moderne", "body bébé original",
    "pyjama bébé original", "vêtement bébé noir blanc",
    "vêtement bébé motif", "body bébé damier",
    "pyjama bébé éclair", "vêtement bébé smiley",
    "vêtement bébé tendance 2026", "mode bébé tendance",
    "vêtement bébé stylé", "tenue bébé chic",
    "vêtement bébé unisexe", "vêtement bébé neutre",
    // TAILLES ET ÂGES
    "vêtement nouveau-né", "vêtement bébé 0-1 mois",
    "vêtement bébé 1-3 mois", "vêtement bébé 3-6 mois",
    "vêtement naissance taille unique", "body taille naissance",
    "pyjama taille naissance", "vêtement prématuré",
    // MARQUE ET LOCAL
    "marque vêtement bébé française", "vêtement bébé marque française",
    "boutique vêtement bébé en ligne", "acheter vêtement bébé en ligne",
    "vêtement bébé livraison rapide", "vêtement bébé livraison France",
    "meilleure marque vêtement bébé", "marque bébé premium France",
    "M!LK bébé", "milk bébé", "milkbebe",
    // RECHERCHES INFORMATIONNELLES (blog futur)
    "comment choisir pyjama bébé", "quelle taille body naissance",
    "combien de bodies naissance", "combien de pyjamas naissance",
    "liste vêtements naissance complète", "quoi acheter pour bébé",
    "premiers vêtements bébé", "vêtements indispensables naissance",
    "guide taille vêtement bébé", "tableau taille bébé",
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
      url:    `${BASE_URL}/images/og/milk-og-homepage.jpg`,
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
    images:      [`${BASE_URL}/images/og/milk-og-homepage.jpg`],
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

  // ── Canonique + hreflang (par locale) ───────────────────────────────────────
  alternates: getAlternates(locale),

  // ── App / PWA ────────────────────────────────────────────────────────────────
  applicationName: "M!LK",
  manifest:        "/manifest.json",
  appleWebApp: {
    capable:        true,
    statusBarStyle: "black-translucent",
    title:          "M!LK",
  },

  // ── Vérification Search Console ──────────────────────────────────────────────
  // Ajouter NEXT_PUBLIC_GSC_VERIFICATION dans Vercel pour activer
  ...(process.env.NEXT_PUBLIC_GSC_VERIFICATION ? {
    verification: { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION },
  } : {}),
  };
}

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

// ── Locale Layout — fournit <html>/<body>, providers, analytics, SEO ──────────
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <head>
        {/* Intro déjà vue → masquage AVANT le premier paint via ce script
            bloquant synchrone (évite tout flash plein écran chez un visiteur
            déjà venu). Le 1er visiteur (clé absente) voit l'intro normalement.
            Doit rester en tête du <head>, avant le rendu du <body>. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('milk_intro_seen')==='1'){var s=document.createElement('style');s.appendChild(document.createTextNode('#milk-intro{display:none!important}'));(document.head||document.documentElement).appendChild(s);}}catch(e){}",
          }}
        />

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
        <link rel="dns-prefetch" href="https://connect.facebook.net" />
        <link rel="preconnect"   href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="preconnect"   href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />

        {/* JSON-LD Schema.org */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* Google Tag Manager — ne s'injecte que si NEXT_PUBLIC_GTM_ID défini */}
        <GTMScript />
      </head>

      <body>
        {/* GTM noscript fallback (sans JS) */}
        <GTMNoScript />
        {/* Tracking visiteur 1st-party (sessions, scroll, durée, géo, device) */}
        <PageTracker />
        {/* Badge Google Merchant Widget (avis clients) sur toutes les pages */}
        <MerchantBadge />
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
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

        <NextIntlClientProvider>
          <WishlistProvider>
            <AuthProvider>
              <CartProvider>
                <IntroProvider>
                  <IntroScreen />
                  <PopupBienvenue />
                  <Header />
                  <main>{children}</main>
                  <Footer />
                  <ChatWidget />
                  <CookieBanner />
                  <ExitIntentPopup />
                  <PromoSticker />
                </IntroProvider>
              </CartProvider>
            </AuthProvider>
          </WishlistProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}