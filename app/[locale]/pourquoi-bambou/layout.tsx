import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getAlternates } from "@/i18n/seo";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "bamboo" });
  return {
    title: t("meta_title"),
    description: t("meta_description"),
    keywords: t.raw("keywords") as string[],
    openGraph: {
      title:       t("og_title"),
      description: t("og_description"),
      images: [{ url: `${BASE}/matiere/bambou-02.png`, width: 1200, height: 630, alt: t("og_image_alt") }],
    },
    twitter: {
      card:        "summary_large_image",
      title:       t("tw_title"),
      description: t("tw_description"),
      images:      [`${BASE}/matiere/bambou-02.png`],
    },
    alternates: getAlternates(locale, "/pourquoi-bambou"),
  };
}

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "bamboo" });

  // JSON-LD FAQPage — jeu curaté (bamboo.meta_ld), DISTINCT de la FAQ visible
  // (bamboo.faq) ; puisé dans la même source i18n → traduit sur /en.
  const ld = t.raw("meta_ld") as { q: string; a: string }[];
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: ld.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {children}
    </>
  );
}
