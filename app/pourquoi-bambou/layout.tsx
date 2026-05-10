import type { Metadata } from "next";

export const metadata: Metadata = {
  title:       "Pourquoi le bambou — M!LK, essentiels bébé bambou OEKO-TEX",
  description: "Le bambou viscose certifié OEKO-TEX est 3× plus doux que le coton, thermorégulateur et antibactérien naturel. Découvrez pourquoi M!LK a choisi le bambou pour les nourrissons 0-6 mois.",
  openGraph: {
    title:       "Pourquoi le bambou — M!LK, essentiels bébé bambou OEKO-TEX",
    description: "Le bambou viscose certifié OEKO-TEX est 3× plus doux que le coton, thermorégulateur et antibactérien naturel. Découvrez pourquoi M!LK a choisi le bambou pour les nourrissons 0-6 mois.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>({children})</>;
}