import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { getAlternates } from "@/i18n/seo";
import { listDeliverableCountries } from "@/lib/delivery-config";
import { getNavCategorySlugs } from "@/lib/categories-nav-server";

import Header        from "@/components/layout/Header";
import Footer        from "@/components/layout/Footer";
import { IntroProvider }  from "@/context/IntroContext";
import IntroScreen   from "@/components/intro/IntroScreen";
import { CartProvider }   from "@/context/CartContext";
import { AuthProvider }   from "@/context/AuthContext";
import PopupBienvenue from "@/components/PopupBienvenue";
import ConsentManager     from "@/components/ConsentManager";
import ExitIntentPopup     from "@/components/ExitIntentPopup";
import PromoSticker        from "@/components/promo/PromoSticker";
import { WishlistProvider } from "@/context/WishlistContext";
import PageTracker from "@/components/analytics/PageTracker";
import MerchantBadge from "@/components/analytics/MerchantBadge";

const BASE_URL   = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

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
    template: "%s | M!LK",
  },

  description:
    "Bodies, pyjamas, gigoteuses et langes nourrisson 0-6 mois en bambou certifié OEKO-TEX Standard 100. 3× plus doux que le coton, thermorégulateur, antibactérien. Idéal peaux sensibles, eczéma. Cadeau naissance parfait. Livraison offerte dès 60€ en France métropolitaine. Marque française.",

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
    "cadeau naissance personnalisé",
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
    "body bébé doux", "pyjama bébé ultra doux",
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
    // PAS de `url` par défaut : un og:url racine (https://www.milkbebe.fr) crée
    // une boucle avec le 307 racine→/fr (Débogueur Facebook). Sans défaut, les
    // pages sans og:url propre n'en déclarent aucun → FB retombe sur l'URL
    // chargée (correcte). Les pages qui ont besoin d'un og:url le déclarent
    // elles-mêmes en auto-référent /{locale}/...  (metadataBase reste défini).
    siteName:    "M!LK",
    title:       "M!LK — Bodies, Pyjamas, Gigoteuses & Langes nourrisson bambou | OEKO-TEX",
    description: "Vêtements nourrisson 0-6 mois en bambou certifié OEKO-TEX. 3× plus doux que le coton, thermorégulateur, antibactérien. Cadeau naissance parfait. Livraison offerte dès 60€ en France métropolitaine.",
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

  // ── Vérification de domaine ──────────────────────────────────────────────────
  // facebook-domain-verification : CONSTANTE (Meta Business Manager). Rendue par ce
  //   layout sur /fr, /en et TOUTES les pages publiques (jamais conditionnée à la locale).
  //   La racine "/" étant un 307 → /fr, Meta suit la redirection et lit la balise sur /fr.
  // google : optionnelle, activée par NEXT_PUBLIC_GSC_VERIFICATION (Vercel).
  verification: {
    other: { "facebook-domain-verification": "db2gywy0qbieijydmnysrz2n2fkp2b" },
    ...(process.env.NEXT_PUBLIC_GSC_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION } : {}),
  },
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
        url:           `${BASE_URL}/logo-milk-white.png`,
        width:         "193",
        height:        "113",
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
        target:        { "@type": "EntryPoint", urlTemplate: `${BASE_URL}/fr/recherche?q={search_term_string}` },
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
      paymentAccepted:    "Credit Card, Apple Pay, Google Pay",
      // Pays réellement desservis (SEO — exactitude prime), DÉRIVÉS de COUNTRY_TO_ZONE (aucun tableau
      // dupliqué) : FR + Monaco (métropole) + 21 UE. Monaco est désormais DANS COUNTRY_TO_ZONE (MC="FR"),
      // plus besoin de l'ajouter à la main. Suisse/UK réapparaissent AUTOMATIQUEMENT dès leur retour.
      areaServed:     [...listDeliverableCountries().map(c => c.code)],
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

  // Catégories de navigation (dérivées des produits publiés, cachées) → Header desktop + drawer (Lot 4).
  const categorySlugs = await getNavCategorySlugs();

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

        {/* Preconnect performances — UNIQUEMENT les domaines fonctionnels (Supabase, Stripe).
            RGPD : PAS de preconnect/dns-prefetch vers Meta/Google Tag Manager/Google Analytics
            avant consentement — un preconnect ouvre déjà une connexion réseau vers le traceur.
            Ces domaines sont préchargés à la volée par ConsentManager APRÈS acceptation. */}
        <link rel="preconnect"   href="https://ntkqmnenczltlwplswka.supabase.co" />
        <link rel="dns-prefetch" href="https://ntkqmnenczltlwplswka.supabase.co" />
        <link rel="preconnect"   href="https://js.stripe.com" />

        {/* JSON-LD Schema.org */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>

      <body>
        {/* Tracking visiteur 1st-party (sessions, scroll, durée, géo, device) — mesure
            d'audience 1re partie (base propre), hors périmètre du consentement tiers. */}
        <PageTracker />
        {/* Badge Google Merchant Widget (avis clients) sur toutes les pages */}
        <MerchantBadge />
        {/* GTM / GA4 / Meta Pixel : chargés UNIQUEMENT après consentement RGPD explicite,
            par <ConsentManager /> monté plus bas (fin du <body>, dans les providers). */}

        <NextIntlClientProvider>
          <WishlistProvider>
            <AuthProvider>
              <CartProvider>
                <IntroProvider>
                  <IntroScreen />
                  <PopupBienvenue />
                  <Header categorySlugs={categorySlugs} />
                  <main>{children}</main>
                  <Footer />
                  <ConsentManager />
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