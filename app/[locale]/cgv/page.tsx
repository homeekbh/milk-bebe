import type { Metadata } from "next";
import { getAlternates } from "@/i18n/seo";
import { getTranslations } from "next-intl/server";
import { getParrainageSettings } from "@/lib/parrainage-server";
import ParrainageBareme from "@/components/ParrainageBareme";

// ISR : le schéma parrainage lit parrainage_settings en base. On régénère la page
// toutes les 5 min → un changement de seuil admin s'y reflète sans redéploiement.
export const revalidate = 300;

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
  // Valeurs du barème lues côté serveur → passées en `initial` au visuel pour un
  // rendu immédiat sans flash sur cette page publique (aucune donnée sensible).
  const p = await getParrainageSettings();
  const parrainageInitial = {
    actif:                p.actif,
    montant_recompense:   p.montant_recompense,
    seuil_filleul:        p.seuil_filleul,
    seuils_parrain:       p.seuils_parrain,
    duree_validite_jours: p.duree_validite_jours,
  };
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
          {
            title: t("cgv_s13"),
            content: t("cgv_s13_c"),
          },
        ].map(section => (
          <div key={section.title} style={{ marginBottom: 36, background: "#fff", borderRadius: 16, padding: "28px 32px", border: "1px solid rgba(26,20,16,0.07)" }}>
            <h2 style={{ margin: "0 0 14px", fontSize: 20, fontWeight: 900, color: "#1a1410" }}>{section.title}</h2>
            <p style={{ margin: 0, fontSize: 15, color: "rgba(26,20,16,0.7)", lineHeight: 1.8, whiteSpace: "pre-line" }}>{section.content}</p>
          </div>
        ))}

        {/* 14. Programme de parrainage — texte légal + schéma DYNAMIQUE (complément
            visuel, ne remplace pas les mentions textuelles). Valeurs live de l'admin. */}
        <div style={{ marginBottom: 36, background: "#fff", borderRadius: 16, padding: "28px 32px", border: "1px solid rgba(26,20,16,0.07)" }}>
          <h2 style={{ margin: "0 0 14px", fontSize: 20, fontWeight: 900, color: "#1a1410" }}>{t("cgv_s14")}</h2>
          <p style={{ margin: "0 0 22px", fontSize: 15, color: "rgba(26,20,16,0.7)", lineHeight: 1.8, whiteSpace: "pre-line" }}>{t("cgv_s14_c")}</p>
          <ParrainageBareme initial={parrainageInitial} variant="light" />
        </div>
      </div>
    </div>
  );
}