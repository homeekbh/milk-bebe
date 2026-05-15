// app/page.tsx — Server Component (PAS de "use client")
// generateMetadata fonctionne ici car ce fichier n'a aucun hook React
import type { Metadata } from "next";
import HomepageClient from "./_homepage/HomepageClient";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

export const metadata: Metadata = {
  title: "M!LK — Bodies, Pyjamas, Gigoteuses & Langes nourrisson bambou | OEKO-TEX | 0-6 mois",
  description:
    "Bodies, pyjamas, gigoteuses et langes nourrisson 0-6 mois en bambou certifié OEKO-TEX Standard 100. 3× plus doux que le coton, thermorégulateur, antibactérien. Idéal peaux sensibles, eczéma. Cadeau naissance parfait. Livraison offerte dès 60€. Marque française.",
  keywords: [
    "body nourrisson bambou", "body bébé naissance bambou", "body bébé 0 3 mois bambou",
    "body bébé nouveau né bambou", "body bébé 0 6 mois", "body bébé manches longues bambou",
    "body bébé certifié OEKO-TEX", "body bébé peau sensible", "body bébé thermorégulateur",
    "pyjama nourrisson bambou", "pyjama bébé naissance bambou", "pyjama bébé 0 3 mois bambou",
    "pyjama bébé zip bambou", "grenouillère bébé bambou", "dors bien bébé naissance bambou",
    "gigoteuse nourrisson bambou", "gigoteuse bébé naissance bambou", "gigoteuse bébé 0 3 mois",
    "turbulette bébé bambou", "sac de couchage bébé bambou", "nid ange bébé bambou",
    "lange nourrisson bambou", "lange emmaillotage nourrisson", "swaddle bébé bambou",
    "bonnet bébé bambou", "bonnet nourrisson bambou",
    "vêtements nourrisson bambou", "vêtements bébé naissance bambou", "vêtements bébé 0 3 mois",
    "vêtements bébé peau sensible", "vêtements bébé OEKO-TEX", "bambou nourrisson OEKO-TEX",
    "layette bambou nourrisson", "essentiels bébé bambou premium",
    "vêtements bébé eczéma", "vêtements bébé peau atopique",
    "trousseau naissance bambou", "valise maternité bébé bambou", "kit naissance bambou",
    "cadeau naissance bambou", "cadeau baby shower bambou", "meilleur cadeau naissance 2025 2026",
    "cadeau naissance original", "idée cadeau bébé bambou",
    "boutique vêtements bébé bambou France", "marque française vêtements bébé bambou",
    "M!LK bébé", "milkbebe", "milk bébé bambou",
  ],
  openGraph: {
    type:      "website",
    locale:    "fr_FR",
    url:       BASE_URL,
    siteName:  "M!LK",
    title:     "M!LK — Essentiels bébé bambou OEKO-TEX | 0-6 mois",
    description:
      "Bodies, pyjamas, gigoteuses et langes nourrisson 0-6 mois en bambou certifié OEKO-TEX. 3× plus doux que le coton. Cadeau naissance parfait.",
    images: [
      {
        url:    `${BASE_URL}/images/og/milk-og-homepage.jpg`,
        width:  1200,
        height: 630,
        alt:    "M!LK — Essentiels bébé bambou premium",
      },
    ],
  },
  twitter: {
    card:        "summary_large_image",
    title:       "M!LK — Essentiels bébé bambou OEKO-TEX | 0-6 mois",
    description: "Bodies, pyjamas, gigoteuses et langes nourrisson en bambou certifié OEKO-TEX. Doux, thermorégulateur, anti-bactérien.",
    images:      [`${BASE_URL}/images/og/milk-og-homepage.jpg`],
  },
  alternates: {
    canonical: BASE_URL,
  },
};

export default function Page() {
  return <HomepageClient />;
}