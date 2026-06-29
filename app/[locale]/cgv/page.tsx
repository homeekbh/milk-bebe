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
  title:       "Conditions Générales de Vente",
  description: "CGV M!LK — EKBH SAS. Paiement Stripe, livraison Colissimo 2-3 jours, retours sous 14 jours, garanties et droit de rétractation.",
  openGraph: {
    title:       "Conditions Générales de Vente — M!LK",
    description: "CGV M!LK — EKBH SAS. Paiement Stripe, livraison Colissimo 2-3 jours, retours sous 14 jours, garanties et droit de rétractation.",
  },
  alternates: getAlternates(locale, "/cgv"),
  };
}

﻿export default async function CGV() {
  const t = await getTranslations("legal");
  return (
    <div style={{ background: "#ede8df", minHeight: "100vh", paddingTop: 100, paddingBottom: 80 }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
        <h1 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 950, letterSpacing: -1.5, color: "#1a1410", marginBottom: 8 }}>
          {t("cgv_title")}
        </h1>
        <p style={{ color: "rgba(26,20,16,0.5)", marginBottom: 48, fontSize: 15 }}>{t("cgv_subtitle")}</p>

        {[
          {
            title: t("cgv_s1"),
            content: `M!LK est une marque exploitée par EKBH, SAS au capital variable
SIREN : 104 298 260
SIRET : 104 298 260 00019
Siège social : Menton (06500), France
Email : contact@milkbebe.fr`,
          },
          {
            title: t("cgv_s2"),
            content: t("cgv_s2_c"),
          },
          {
            title: t("cgv_s3"),
            content: t("cgv_s3_c"),
          },
          {
            title: t("cgv_s4"),
            content: t("cgv_s4_c"),
          },
          {
            title: t("cgv_s5"),
            content: t("cgv_s5_c"),
          },
          {
            title: t("cgv_s6"),
            content: t("cgv_s6_c"),
          },
          {
            title: t("cgv_s7"),
            content: t("cgv_s7_c"),
          },
          {
            title: t("cgv_s8"),
            content: t("cgv_s8_c"),
          },
          {
            title: t("cgv_s9"),
            content: t("cgv_s9_c"),
          },
          {
            title: t("cgv_s10"),
            content: t("cgv_s10_c"),
          },
          {
            title: t("cgv_s11"),
            content: t("cgv_s11_c"),
          },
          {
            title: t("cgv_s12"),
            content: t("cgv_s12_c"),
          },
        ].map(section => (
          <div key={section.title} style={{ marginBottom: 36, background: "#fff", borderRadius: 16, padding: "28px 32px", border: "1px solid rgba(26,20,16,0.07)" }}>
            <h2 style={{ margin: "0 0 14px", fontSize: 20, fontWeight: 900, color: "#1a1410" }}>{section.title}</h2>
            <p style={{ margin: 0, fontSize: 15, color: "rgba(26,20,16,0.7)", lineHeight: 1.8, whiteSpace: "pre-line" }}>{section.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}