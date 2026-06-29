import type { Metadata } from "next";
import { getAlternates } from "@/i18n/seo";
import { JsonLd } from "@/components/seo/JsonLd";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> }
): Promise<Metadata> {
  const { locale } = await params;
  return {
    // "| M!LK" retiré : le template "%s | M!LK" du layout racine l'ajoute.
    title: "Guide des tailles bébé 0-6 mois",
    description:
      "Quelle taille choisir pour bébé de la naissance à 6 mois ? Tableau des tailles, conseils pour mesurer et bien choisir ses vêtements bambou M!LK.",
    alternates: getAlternates(locale, "/guide-des-tailles"),
    openGraph: {
      type:        "website",
      url:         `${BASE}/${locale}/guide-des-tailles`,
      siteName:    "M!LK",
      title:       "Guide des tailles bébé 0-6 mois — M!LK",
      description: "Tableau des tailles bébé 0-6 mois, comment mesurer et bien choisir. Vêtements bébé bambou OEKO-TEX M!LK.",
      images:      [{ url: `${BASE}/images/og/milk-og-homepage.jpg`, width: 1200, height: 630 }],
    },
  };
}

// FAQPage — synchronisé avec la FAQ visible de page.tsx.
const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "Bébé est entre deux tailles, je prends laquelle ?", acceptedAnswer: { "@type": "Answer", text: "La plus grande. Un peu d'aisance vaut mieux qu'un vêtement qui serre." } },
    { "@type": "Question", name: "Le bambou rétrécit-il au lavage ?", acceptedAnswer: { "@type": "Answer", text: "Lavé à 30°, non." } },
    { "@type": "Question", name: "Quelle différence entre Nouveau-né et 0-3 mois ?", acceptedAnswer: { "@type": "Answer", text: "Environ 10 cm et un bon kilo. Le Nouveau-né est taillé pour les premières semaines, le 0-3 prend le relais vite." } },
  ],
};

export default async function GuideTaillesLayout(
  { children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }
) {
  const { locale } = await params;
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil",            item: `${BASE}/${locale}` },
      { "@type": "ListItem", position: 2, name: "Guide des tailles",  item: `${BASE}/${locale}/guide-des-tailles` },
    ],
  };
  return (
    <>
      <JsonLd data={[breadcrumbLd, faqLd]} />
      {children}
    </>
  );
}
