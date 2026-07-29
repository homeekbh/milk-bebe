import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getAlternates } from "@/i18n/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });
  return {
    title:       t("meta_title"),
    description: t("meta_description"),
    openGraph: {
      title:       t("og_title"),
      description: t("og_description"),
    },
    alternates: getAlternates(locale, "/politique-confidentialite"),
  };
}

export default async function PolitiqueConfidentialite({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("privacy");
  const sections = t.raw("sections") as { title: string; content: string }[];

  return (
    <div style={{ background: "#ede8df", minHeight: "100vh", paddingTop: 100, paddingBottom: 80 }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
        <h1 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 950, letterSpacing: -1.5, color: "#1a1410", marginBottom: 8 }}>
          {t("title")}
        </h1>
        <p style={{ color: "rgba(26,20,16,0.5)", marginBottom: 48, fontSize: 15 }}>{t("subtitle")}</p>

        {sections.map(section => (
          <div key={section.title} style={{ marginBottom: 28, background: "#fff", borderRadius: 16, padding: "28px 32px", border: "1px solid rgba(26,20,16,0.07)" }}>
            <h2 style={{ margin: "0 0 14px", fontSize: 20, fontWeight: 900, color: "#1a1410" }}>{section.title}</h2>
            <p style={{ margin: 0, fontSize: 15, color: "rgba(26,20,16,0.7)", lineHeight: 1.8, whiteSpace: "pre-line" }}>{section.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
