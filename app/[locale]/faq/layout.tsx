import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getAlternates } from "@/i18n/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faq" });
  return {
    title: t("meta_title"),
    description: t("meta_description"),
    alternates: getAlternates(locale, "/faq"),
    openGraph: {
      title: t("og_title"),
      description: t("og_description"),
    },
  };
}

export default async function FAQLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faq" });

  // JSON-LD FAQPage — jeu curaté (faq.ld), puisé dans la même source i18n → /en.
  const ld = t.raw("ld") as { q: string; a: string }[];
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
