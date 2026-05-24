import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

export const metadata: Metadata = {
  title:       "Qui sommes-nous | M!LK — La fondatrice",
  description: "M!LK est une marque française d'essentiels bébé en bambou certifié OEKO-TEX Standard 100, fondée par Erika, maman de deux garçons. Découvrez l'histoire et la vision.",
  keywords: [
    "M!LK fondatrice",
    "Erika M!LK",
    "marque française bébé bambou",
    "qui est M!LK",
    "histoire M!LK",
    "vêtement bébé made in France bambou",
    "fondatrice marque bébé bambou",
  ],
  alternates: { canonical: `${BASE}/qui-sommes-nous` },
  openGraph: {
    title:       "Qui sommes-nous — M!LK",
    description: "Marque française d'essentiels bébé en bambou certifié OEKO-TEX Standard 100, fondée par Erika.",
    url:         `${BASE}/qui-sommes-nous`,
    siteName:    "M!LK",
    locale:      "fr_FR",
    type:        "website",
    images: [{
      url:    `${BASE}/storage/v1/object/public/product-images/erika-et-ses-enfants.jpg`,
      width:  1200,
      height: 630,
      alt:    "Erika et ses garçons — fondatrice de M!LK",
    }],
  },
  twitter: {
    card:        "summary_large_image",
    title:       "Qui sommes-nous — M!LK",
    description: "Erika, fondatrice de M!LK — essentiels bébé bambou OEKO-TEX.",
  },
};

export default function QuiSommesNousLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}