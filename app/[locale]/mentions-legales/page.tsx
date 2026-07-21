import type { Metadata } from "next";
import { getAlternates } from "@/i18n/seo";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
  title:       "Mentions légales",
  description: "Mentions légales de milkbebe.fr — EKBH SASU, SIRET 104 298 260 00019, Menton. Hébergement Vercel Inc.",
  openGraph: {
    title:       "Mentions légales — M!LK",
    description: "Mentions légales de milkbebe.fr — EKBH SASU, SIRET 104 298 260 00019, Menton. Hébergement Vercel Inc.",
  },
  alternates: getAlternates(locale, "/mentions-legales"),
  };
}

export default async function MentionsLegales() {
  const t = await getTranslations("legal");
  return (
    <div style={{ background: "#ede8df", minHeight: "100vh", paddingTop: 100, paddingBottom: 80 }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
        <h1 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 950, letterSpacing: -1.5, color: "#1a1410", marginBottom: 8 }}>
          {t("ml_title")}
        </h1>
        <p style={{ color: "rgba(26,20,16,0.5)", marginBottom: 48, fontSize: 15 }}>{t("ml_subtitle")}</p>

        {[
          {
            title: t("ml_editor"),
            content: `M!LK est une marque exploitée par EKBH, SASU
SIREN : 104 298 260
SIRET : 104 298 260 00019
Siège social : Menton (06500), France
Email : contact@milkbebe.fr
Design & développement : BHK — Design & Graphisme
Contact BHK : +33 7 45 27 21 34`,
          },
          {
            title: t("ml_hosting"),
            content: `Vercel Inc.
340 Pine Street, Suite 900
San Francisco, CA 94104 — États-Unis
Site : vercel.com`,
          },
          {
            title: t("ml_ip"),
            content: t("ml_ip_content"),
          },
          {
            title: t("ml_data"),
            content: t("ml_data_content"),
          },
          {
            title: t("ml_cookies"),
            content: t("ml_cookies_content"),
          },
          {
            title: t("ml_liability"),
            content: t("ml_liability_content"),
          },
          {
            title: t("ml_law"),
            content: t("ml_law_content"),
          },
        ].map(section => (
          <div key={section.title} style={{ marginBottom: 28, background: "#fff", borderRadius: 16, padding: "28px 32px", border: "1px solid rgba(26,20,16,0.07)" }}>
            <h2 style={{ margin: "0 0 14px", fontSize: 20, fontWeight: 900, color: "#1a1410" }}>{section.title}</h2>
            <p style={{ margin: 0, fontSize: 15, color: "rgba(26,20,16,0.7)", lineHeight: 1.8, whiteSpace: "pre-line" }}>{section.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}