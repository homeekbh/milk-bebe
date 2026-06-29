import type { Metadata } from "next";
import { getAlternates } from "@/i18n/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title:       "Contact",
    description: "Contactez l'équipe M!LK pour toute question sur nos produits, commandes ou livraisons. Réponse sous 24h.",
    openGraph: {
      title:       "Contact — M!LK",
      description: "Contactez l'équipe M!LK pour toute question sur nos produits, commandes ou livraisons. Réponse sous 24h.",
    },
    alternates: getAlternates(locale, "/contact"),
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
