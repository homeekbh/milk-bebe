import type { Metadata } from "next";
import { supabaseServer } from "@/lib/server/supabase";
import { getAlternates } from "@/i18n/seo";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
  title:       "Livraison & Retours — M!LK",
  description: "Livraison Colissimo offerte dès 60€ en France, Belgique, Suisse, Luxembourg et Monaco. Délai 2-3 jours ouvrés. Retours sous 14 jours (frais client).",
  openGraph: {
    title:       "Livraison & Retours — M!LK",
    description: "Livraison Colissimo offerte dès 60€ en France, Belgique, Suisse, Luxembourg et Monaco. Délai 2-3 jours ouvrés. Retours sous 14 jours (frais client).",
  },
  alternates: getAlternates(locale, "/livraison"),
  };
}

async function getFreeShipThreshold(): Promise<number> {
  try {
    const { data } = await supabaseServer
      .from("settings")
      .select("value")
      .eq("key", "free_shipping_threshold")
      .maybeSingle();
    const n = Number(data?.value);
    return Number.isFinite(n) && n > 0 ? n : 60;
  } catch {
    return 60;
  }
}

﻿export default async function LivraisonRetours() {
  const FREE = await getFreeShipThreshold();
  const t = await getTranslations("shipping");
  return (
    <div style={{ background: "#ede8df", minHeight: "100vh", paddingTop: 100, paddingBottom: 80 }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
        <h1 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 950, letterSpacing: -1.5, color: "#1a1410", marginBottom: 8 }}>
          {t("title")}
        </h1>
        <p style={{ color: "rgba(26,20,16,0.5)", marginBottom: 48, fontSize: 15 }}>{t("subtitle")}</p>

        {/* Livraison */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 26, fontWeight: 950, color: "#1a1410", marginBottom: 8 }}>{t("delivery_title")}</h2>
          <p style={{ fontSize: 14, color: "rgba(26,20,16,0.55)", marginBottom: 24, fontWeight: 600 }}>
            {t("delivery_summary", { amount: FREE })}
          </p>
          <div style={{ display: "grid", gap: 16, marginBottom: 28 }}>
            {[
              { label: t("zone_france"),  delay: t("delay"), price: t("free_from", { amount: FREE }) },
              { label: t("zone_benelux"), delay: t("delay"), price: t("free_from_80") },
              { label: t("zone_swiss"),   delay: t("delay"), price: t("free_from_100") },
              { label: t("zone_monaco"),  delay: t("delay"), price: t("free_from", { amount: FREE }) },
            ].map(zone => (
              <div key={zone.label} style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", border: "1px solid rgba(26,20,16,0.07)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, alignItems: "center" }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#1a1410" }}>{zone.label}</div>
                <div style={{ fontSize: 14, color: "rgba(26,20,16,0.55)" }}>{zone.delay}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#c49a4a" }}>{zone.price}</div>
              </div>
            ))}
          </div>
          <div style={{ background: "#1a1410", borderRadius: 16, padding: "24px 28px" }}>
            <p style={{ margin: 0, fontSize: 15, color: "rgba(242,237,230,0.7)", lineHeight: 1.8 }}>
              {t("delivery_note")}
            </p>
          </div>
        </div>

        {/* Retours */}
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 950, color: "#1a1410", marginBottom: 8 }}>{t("returns_title")}</h2>
          <p style={{ fontSize: 14, color: "rgba(26,20,16,0.55)", marginBottom: 24, fontWeight: 600 }}>
            {t("returns_summary")}
          </p>
          <div style={{ display: "grid", gap: 16 }}>
            {[
              { step: "1", title: t("step1_title"), desc: t("step1_desc") },
              { step: "2", title: t("step2_title"), desc: t("step2_desc") },
              { step: "3", title: t("step3_title"), desc: t("step3_desc") },
            ].map(step => (
              <div key={step.step} style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", border: "1px solid rgba(26,20,16,0.07)", display: "flex", gap: 20, alignItems: "flex-start" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#c49a4a", color: "#1a1410", display: "grid", placeItems: "center", fontWeight: 950, fontSize: 18, flexShrink: 0 }}>
                  {step.step}
                </div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 18, color: "#1a1410", marginBottom: 8 }}>{step.title}</div>
                  <div style={{ fontSize: 15, color: "rgba(26,20,16,0.6)", lineHeight: 1.7 }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24, padding: "20px 24px", borderRadius: 14, background: "#fff", border: "1px solid rgba(26,20,16,0.07)" }}>
            <p style={{ margin: 0, fontSize: 14, color: "rgba(26,20,16,0.5)", lineHeight: 1.7 }}>
              <strong style={{ color: "#1a1410" }}>{t("conditions_label")}</strong> {t("conditions")} <strong style={{ color: "#1a1410" }}>{t("conditions_fee")}</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}