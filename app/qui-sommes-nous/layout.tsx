import type { Metadata } from "next";

export const metadata: Metadata = {
  title:       "Qui sommes-nous — M!LK, essentiels bébé bambou OEKO-TEX",
  description: "M!LK est une marque française d'essentiels bébé en bambou certifié OEKO-TEX Standard 100. Corps, pyjamas, gigoteuses et langes pour nourrissons 0-6 mois. Découvrez notre histoire et notre engagement qualité.",
  openGraph: {
    title:       "Qui sommes-nous — M!LK",
    description: "Marque française d'essentiels bébé en bambou certifié OEKO-TEX Standard 100.",
    url:         "https://www.milkbebe.fr/qui-sommes-nous",
  },
};

export default function QuiSommesNousLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}