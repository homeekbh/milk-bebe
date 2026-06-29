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
    title: "Vêtements bébé peau sensible & réactive",
    description:
      "Peau de bébé fragile ou réactive ? Découvrez pourquoi le bambou OEKO-TEX M!LK est si doux : sans substances nocives, anti-frottements, respirant.",
    alternates: getAlternates(locale, "/vetements-bebe-peau-sensible"),
    openGraph: {
      type:        "website",
      url:         `${BASE}/${locale}/vetements-bebe-peau-sensible`,
      siteName:    "M!LK",
      title:       "Vêtements bébé peau sensible & réactive — M!LK",
      description: "Pourquoi le bambou OEKO-TEX M!LK est si doux pour les peaux fragiles : sans substances nocives, anti-frottements, respirant.",
      images:      [{ url: `${BASE}/images/pourquoi-bambou/bambou-oekotex.webp`, width: 1200, height: 630 }],
    },
  };
}

// FAQPage — synchronisé avec la FAQ visible de page.tsx. Aucun claim médical.
const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "Le bambou convient-il aux peaux à tendance eczéma ?", acceptedAnswer: { "@type": "Answer", text: "C'est une matière douce et certifiée sans substances nocives, souvent bien tolérée par les peaux réactives. Pour un eczéma diagnostiqué, demande conseil à ton pédiatre." } },
    { "@type": "Question", name: "OEKO-TEX, ça veut dire bio ?", acceptedAnswer: { "@type": "Answer", text: "Non. Ça garantit l'absence de substances nocives, pas l'origine biologique." } },
  ],
};

export default async function PeauSensibleLayout(
  { children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }
) {
  const { locale } = await params;
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil",                          item: `${BASE}/${locale}` },
      { "@type": "ListItem", position: 2, name: "Vêtements bébé peau sensible",      item: `${BASE}/${locale}/vetements-bebe-peau-sensible` },
    ],
  };
  return (
    <>
      <JsonLd data={[breadcrumbLd, faqLd]} />
      {children}
    </>
  );
}
