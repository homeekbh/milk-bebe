import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getAlternates } from "@/i18n/seo";
import { JsonLd } from "@/components/seo/JsonLd";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> }
): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("sizeguide");
  return {
    // "| M!LK" ajouté par le template "%s | M!LK" du layout racine → titre nu ici.
    title:       t("meta_title"),
    description: t("meta_description"),
    alternates:  getAlternates(locale, "/guide-des-tailles"),
    openGraph: {
      type:        "website",
      url:         `${BASE}/${locale}/guide-des-tailles`,
      siteName:    "M!LK",
      title:       t("og_title"),
      description: t("og_description"),
      images:      [{ url: `${BASE}/images/og/milk-og-homepage.jpg`, width: 1200, height: 630 }],
    },
  };
}

export default async function GuideTaillesLayout(
  { children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }
) {
  const { locale } = await params;
  const t = await getTranslations("sizeguide");

  // FAQPage — MÊME source i18n que la FAQ visible de page.tsx (t.raw("faq")) → correct sur /en.
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
      { "@type": "ListItem", position: 1, name: t("crumb_home"),   item: `${BASE}/${locale}` },
      { "@type": "ListItem", position: 2, name: t("breadcrumb"),   item: `${BASE}/${locale}/guide-des-tailles` },
    ],
  };

  return (
    <>
      <JsonLd data={[breadcrumbLd, faqLd]} />
      {children}
    </>
  );
}
