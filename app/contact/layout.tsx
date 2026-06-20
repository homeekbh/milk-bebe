import type { Metadata } from "next";

export const metadata: Metadata = {
  title:       "Contact — M!LK",
  description: "Contactez l'équipe M!LK pour toute question sur nos produits, commandes ou livraisons. Réponse sous 24h.",
  openGraph: {
    title:       "Contact — M!LK",
    description: "Contactez l'équipe M!LK pour toute question sur nos produits, commandes ou livraisons. Réponse sous 24h.",
  },
  alternates: { canonical: "https://www.milkbebe.fr/contact" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}