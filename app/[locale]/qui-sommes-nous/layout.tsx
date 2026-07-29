import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/seo/JsonLd";
import { getAlternates } from "@/i18n/seo";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";
const ERIKA_IMG = "https://ntkqmnenczltlwplswka.supabase.co/storage/v1/object/public/product-images/erika-et-ses-enfants.jpg";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return {
    title:       t("meta_title"),
    description: t("meta_description"),
    keywords: t.raw("meta_keywords") as string[],
    alternates: getAlternates(locale, "/qui-sommes-nous"),
    openGraph: {
      title:       t("og_title"),
      description: t("og_description"),
      siteName:    "M!LK",
      locale:      locale === "en" ? "en_GB" : "fr_FR",
      type:        "website",
      images: [{
        url:    ERIKA_IMG,
        width:  1200,
        height: 630,
        alt:    t("og_image_alt"),
      }],
    },
    twitter: {
      card:        "summary_large_image",
      title:       t("tw_title"),
      description: t("tw_description"),
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
  const t = await getTranslations({ locale, namespace: "about" });

  // URLs structurées en /{loc} DIRECT (zéro 307). L'Organization est référencée
  // par son @id (identifiant du nœud défini dans le layout racine) — un @id n'est
  // pas crawlé, donc pas de redirection, et ça consolide l'entité (1 seule Org).
  const personLd = {
    "@context":   "https://schema.org",
    "@type":      "Person",
    name:         "Erika",
    jobTitle:     t("person_jobtitle"),
    worksFor:     { "@id": `${BASE}/#organization` },
    description:  t("person_desc"),
    image:        ERIKA_IMG,
  };

  const aboutPageLd = {
    "@context":   "https://schema.org",
    "@type":      "AboutPage",
    name:         t("aboutpage_name"),
    url:          `${BASE}/${loc}/qui-sommes-nous`,
    mainEntity:   { "@id": `${BASE}/#organization` },
    about:        { "@id": `${BASE}/#organization` },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type":    "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t("breadcrumb_home"), item: `${BASE}/${loc}` },
      { "@type": "ListItem", position: 2, name: t("breadcrumb_self"), item: `${BASE}/${loc}/qui-sommes-nous` },
    ],
  };

  return (
    <>
      <JsonLd data={[personLd, aboutPageLd, breadcrumbLd]} />
      {children}
    </>
  );
}
