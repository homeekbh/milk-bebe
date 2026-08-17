// app/page.tsx — Server Component (PAS de "use client")
// generateMetadata fonctionne ici car ce fichier n'a aucun hook React
import type { Metadata } from "next";
import HomepageClient from "./_homepage/HomepageClient";
import { getAlternates } from "@/i18n/seo";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isEN = locale === "en";
  // Métadonnées LOCALISÉES : /en ne doit JAMAIS servir de texte FR (signal de qualité
  // faible pour Google). `desc` sert la meta + og + twitter (source unique par locale).
  const desc = isEN
    ? "Baby essentials for 0-6 months in OEKO-TEX certified bamboo. Soft on skin, temperature-regulating, nothing you don't need. Free delivery over €60."
    : "Des essentiels bébé 0-6 mois en bambou certifié OEKO-TEX. Doux sur la peau, thermorégulants, sans superflu. Livraison offerte dès 60€.";
  const ogTitle = isEN
    ? "M!LK — OEKO-TEX bamboo essentials for newborns"
    : "M!LK — Essentiels bébé bambou OEKO-TEX | 0-6 mois";
  const ogAlt = isEN
    ? "M!LK — premium baby bamboo essentials"
    : "M!LK — Essentiels bébé bambou premium";
  return {
  // `absolute` → contourne le title.template du layout racine (sinon « | M!LK »
  // serait dupliqué). Title court et lisible, localisé FR/EN.
  title: {
    absolute: locale === "en"
      ? "Baby Bamboo Bodysuits & Pyjamas OEKO-TEX | M!LK"
      : "Bodies & Pyjamas bébé bambou OEKO-TEX | M!LK",
  },
  description: desc,
  openGraph: {
    type:      "website",
    locale:    locale === "en" ? "en_GB" : "fr_FR",
    // Auto-référent localisé (= canonical) pour casser la boucle og:url racine →
    // 307 → /fr signalée par le Débogueur Facebook. La racine n'est jamais l'URL
    // canonique d'une page (localePrefix:'always').
    url:       `${BASE_URL}/${locale}`,
    siteName:  "M!LK",
    title:     ogTitle,
    description: desc,
    images: [
      {
        url:    `${BASE_URL}/images/og/milk-og-homepage.jpg`,
        width:  1200,
        height: 630,
        alt:    ogAlt,
      },
    ],
  },
  twitter: {
    card:        "summary_large_image",
    title:       ogTitle,
    description: desc,
    images:      [`${BASE_URL}/images/og/milk-og-homepage.jpg`],
  },
  alternates: getAlternates(locale),
  };
}

export default function Page() {
  return <HomepageClient />;
}