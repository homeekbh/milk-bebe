"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import CountrySelector from "@/components/checkout/CountrySelector";
import {
  getZoneForCountry,
  getInternationalShippingPrice,
  isFreeShippingEligibleZone,
} from "@/lib/delivery-config";

/**
 * DÉMO ISOLÉE (Lot 2) — non branchée sur le vrai panier. Sert à tester le
 * CountrySelector + l'affichage prix de zone sur la preview Vercel. Sera
 * retirée/remplacée au lot d'intégration finale.
 */
export default function LivraisonPreviewClient() {
  const locale = useLocale();
  const en = locale === "en";
  const [country, setCountry] = useState("FR");

  const zone  = getZoneForCountry(country);
  const price = getInternationalShippingPrice(country); // null pour FR (matrice domestique)
  const freeEligible = zone ? isFreeShippingEligibleZone(zone) : false;

  const fmt = (n: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(n);

  const t = {
    title:        en ? "International delivery — preview" : "Livraison internationale — aperçu",
    intro:        en
      ? "Isolated test page (Lot 2), not wired into the real cart. Pick a country to preview the shipping price for its zone."
      : "Page de test isolée (Lot 2), non branchée sur le vrai panier. Choisis un pays pour prévisualiser le prix de livraison de sa zone.",
    countryLabel: en ? "Delivery country" : "Pays de livraison",
    frTitle:      en ? "Mainland France" : "France métropolitaine",
    frBody:       en
      ? "Usual carriers (Colissimo / Mondial Relay) — coming in a later lot. The €60 free-shipping threshold applies here."
      : "Transporteurs habituels (Colissimo / Mondial Relay) — à venir dans un lot suivant. Le seuil de livraison offerte dès 60 € s'applique ici.",
    intlLabel:    en ? "Shipping" : "Livraison",
    intlPaid:     en ? "Paid shipping — international" : "Livraison payante à l'international",
    noFree:       en
      ? "The €60 free-shipping threshold applies to mainland France only."
      : "Le seuil de livraison offerte dès 60 € ne s'applique qu'à la France métropolitaine.",
    notDeliverable: en ? "Not deliverable." : "Non livrable.",
    zoneWord:     en ? "Zone" : "Zone",
  };

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "100px 24px 80px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 950, letterSpacing: -1, color: "#1a1410", marginBottom: 8 }}>{t.title}</h1>
      <p style={{ fontSize: 14, color: "rgba(26,20,16,0.55)", lineHeight: 1.6, marginBottom: 28 }}>{t.intro}</p>

      <CountrySelector value={country} onChange={setCountry} label={t.countryLabel} />

      <div style={{ marginTop: 24, background: "#fff", borderRadius: 16, border: "1px solid rgba(26,20,16,0.1)", padding: "24px 26px" }}>
        {country === "FR" ? (
          <>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "#c49a4a", marginBottom: 8 }}>{t.frTitle}</div>
            <p style={{ margin: 0, fontSize: 15, color: "#1a1410", lineHeight: 1.6 }}>{t.frBody}</p>
          </>
        ) : price !== null && zone ? (
          <>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "rgba(26,20,16,0.6)" }}>{t.intlLabel}</span>
              <span style={{ fontSize: 24, fontWeight: 950, color: "#1a1410" }}>{fmt(price)}</span>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: "#c49a4a" }}>{t.intlPaid} · {t.zoneWord} {zone}</div>
            <p style={{ margin: "12px 0 0", fontSize: 13, color: "rgba(26,20,16,0.5)", lineHeight: 1.6 }}>{t.noFree}</p>
          </>
        ) : (
          <p style={{ margin: 0, fontSize: 15, color: "#b91c1c", fontWeight: 700 }}>{t.notDeliverable}</p>
        )}
      </div>

      {/* Rappel dev — retiré au lot d'intégration finale */}
      <p style={{ marginTop: 20, fontSize: 11, color: "rgba(26,20,16,0.35)", fontFamily: "monospace" }}>
        country={country} · zone={zone ?? "—"} · freeShippingEligible={String(freeEligible)}
      </p>
    </div>
  );
}
