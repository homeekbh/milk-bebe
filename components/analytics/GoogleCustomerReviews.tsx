"use client";

import { useEffect } from "react";

/**
 * Google Customer Reviews — opt-in affiché sur la page de confirmation.
 * Permet à Google d'envoyer (avec l'accord du client) un email d'invitation à
 * laisser un avis quelques jours après la livraison.
 *
 * ⚠️ platform.js est chargé avec ?onload=renderOptIn : window.renderOptIn DOIT
 * exister AVANT que le script ne s'exécute. On définit donc renderOptIn puis on
 * injecte le script dans le même useEffect (ordre garanti) — au lieu de deux
 * <Script> dont l'ordre de chargement n'est pas déterministe.
 */

const MERCHANT_ID = 5800602000;

export default function GoogleCustomerReviews({ orderId, customerEmail, estimatedDeliveryDate }: {
  orderId: string;
  customerEmail: string;
  estimatedDeliveryDate: string;
}) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!orderId || !customerEmail) return;

    const w = window as any;

    // 1. Définir renderOptIn AVANT le chargement de platform.js.
    w.renderOptIn = function () {
      try {
        w.gapi.load("surveyoptin", function () {
          w.gapi.surveyoptin.render({
            merchant_id:             MERCHANT_ID,
            order_id:                orderId,
            email:                   customerEmail,
            delivery_country:        "FR",
            estimated_delivery_date: estimatedDeliveryDate,
          });
        });
      } catch { /* non bloquant */ }
    };

    // 2. Charger platform.js une seule fois ; sinon relancer le rendu.
    const existing = document.getElementById("google-platform-js");
    if (existing) {
      if (w.gapi) w.renderOptIn();
      return;
    }
    const s = document.createElement("script");
    s.id = "google-platform-js";
    s.src = "https://apis.google.com/js/platform.js?onload=renderOptIn";
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  }, [orderId, customerEmail, estimatedDeliveryDate]);

  // Badge Google Avis Clients (rendu par platform.js une fois M!LK noté).
  return (
    <div
      style={{ display: "flex", justifyContent: "center", padding: "8px 0 28px" }}
      dangerouslySetInnerHTML={{ __html: `<g:ratingbadge merchant_id="${MERCHANT_ID}"></g:ratingbadge>` }}
    />
  );
}
