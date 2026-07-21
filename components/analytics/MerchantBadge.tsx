"use client";

import { useEffect } from "react";
import { useConsentAccepted } from "@/components/analytics/consent-store";

const MERCHANT_ID = 5800602000;

/**
 * Charge le Google Merchant Widget (badge avis flottant) une seule fois,
 * quelle que soit le nombre de composants qui l'appellent (idempotent via l'id
 * du script + un flag global). Le badge s'affiche en bas à droite sur toutes
 * les pages où il est monté.
 */
export function loadMerchantWidget() {
  if (typeof window === "undefined") return;
  const w = window as any;

  const start = () => {
    if (w.__milkMerchantStarted) return;
    if (w.merchantwidget && typeof w.merchantwidget.start === "function") {
      w.__milkMerchantStarted = true;
      try {
        w.merchantwidget.start({ merchant_id: MERCHANT_ID, position: "BOTTOM_RIGHT", region: "FR" });
      } catch { /* non bloquant */ }
    }
  };

  const existing = document.getElementById("merchantWidgetScript");
  if (existing) { start(); return; }

  const s = document.createElement("script");
  s.id = "merchantWidgetScript";
  s.src = "https://www.gstatic.com/shopping/merchant/merchantwidget.js";
  s.defer = true;
  s.onload = start;
  document.head.appendChild(s);
}

/** Badge global — à injecter dans le layout pour toutes les pages. Chargé UNIQUEMENT
 *  après consentement « accepté » (script tiers Google gstatic). */
export default function MerchantBadge() {
  const accepted = useConsentAccepted();
  useEffect(() => { if (accepted) loadMerchantWidget(); }, [accepted]);
  return null;
}
