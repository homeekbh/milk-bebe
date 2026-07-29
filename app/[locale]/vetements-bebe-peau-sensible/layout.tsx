import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getAlternates } from "@/i18n/seo";
import { JsonLd } from "@/components/seo/JsonLd";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> }
): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "peauSensible" });
  return {
    // "| M!LK" retiré : le template "%s | M!LK" du layout racine l'ajoute.
    title: t("meta_title"),
    description: t("meta_description"),
    alternates: getAlternates(locale, "/vetements-bebe-peau-sensible"),
    openGraph: {
      type:        "website",
      url:         `${BASE}/${locale}/vetements-bebe-peau-sensible`,
      siteName:    "M!LK",
      title:       t("og_title"),
      description: t("og_description"),
      images:      [{ url: `${BASE}/images/pourquoi-bambou/bambou-oekotex.webp`, width: 1200, height: 630 }],
    },
  };
}

export default async function PeauSensibleLayout(
  { children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }
) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "peauSensible" });

  // FAQPage — MÊME source i18n que la FAQ visible de page.tsx (peauSensible.faq)
  // → traduit sur /en. Aucun claim médical.
  const faq = t.raw("faq") as { q: string; a: string }[];
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(f => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t("crumb_home"), item: `${BASE}/${locale}` },
      { "@type": "ListItem", position: 2, name: t("crumb_self"), item: `${BASE}/${locale}/vetements-bebe-peau-sensible` },
    ],
  };
  return (
    <>
      <JsonLd data={[breadcrumbLd, faqLd]} />
      {children}
    </>
  );
}
