import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { getAlternates } from "@/i18n/seo";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
  title:       "Qui sommes-nous — La fondatrice",
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
  alternates: getAlternates(locale, "/qui-sommes-nous"),
  openGraph: {
    title:       "Qui sommes-nous — M!LK",
    description: "Marque française d'essentiels bébé en bambou certifié OEKO-TEX Standard 100, fondée par Erika.",
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
}

export default async function QuiSommesNousLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const loc = locale === "en" ? "en" : "fr";

  // URLs structurées en /{loc} DIRECT (zéro 307). L'Organization est référencée
  // par son @id (identifiant du nœud défini dans le layout racine) — un @id n'est
  // pas crawlé, donc pas de redirection, et ça consolide l'entité (1 seule Org).
  const personLd = {
    "@context":   "https://schema.org",
    "@type":      "Person",
    name:         "Erika",
    jobTitle:     "Fondatrice",
    worksFor:     { "@id": `${BASE}/#organization` },
    description:  "Maman de deux garçons, fondatrice de M!LK — marque française d'essentiels bébé en bambou certifié OEKO-TEX.",
    image:        `https://ntkqmnenczltlwplswka.supabase.co/storage/v1/object/public/product-images/erika-et-ses-enfants.jpg`,
  };

  const aboutPageLd = {
    "@context":   "https://schema.org",
    "@type":      "AboutPage",
    name:         "Qui sommes-nous — M!LK",
    url:          `${BASE}/${loc}/qui-sommes-nous`,
    mainEntity:   { "@id": `${BASE}/#organization` },
    about:        { "@id": `${BASE}/#organization` },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type":    "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil",          item: `${BASE}/${loc}` },
      { "@type": "ListItem", position: 2, name: "Qui sommes-nous",  item: `${BASE}/${loc}/qui-sommes-nous` },
    ],
  };

  return (
    <>
      <JsonLd data={[personLd, aboutPageLd, breadcrumbLd]} />
      {children}
    </>
  );
}