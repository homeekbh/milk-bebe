"use client";

/**
 * Source UNIQUE de l'état de consentement cookies (RGPD/CNIL).
 *
 * Mécanisme historique de ConsentManager, EXTRAIT ici pour être réutilisé par les
 * autres chargements tiers (MerchantBadge, GoogleCustomerReviews) sans le réinventer :
 * localStorage `milk_cookie_consent` = { status, ts }, validité 13 mois. Un consentement
 * « accepted » débloque la mesure d'audience & publicité.
 *
 * `useConsentAccepted()` est RÉACTIF : writeConsent() émet un événement `milk-consent-
 * changed` → les composants montés se mettent à jour dès que l'utilisateur choisit
 * (pas besoin de recharger la page). L'événement `storage` couvre les autres onglets.
 */

import { useEffect, useState } from "react";

export type ConsentStatus = "accepted" | "refused" | null;

const KEY        = "milk_cookie_consent";
const MAX_AGE_MS = 13 * 30 * 24 * 60 * 60 * 1000; // ~13 mois (recommandation CNIL)
const EVENT      = "milk-consent-changed";

export function readConsent(): ConsentStatus {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    if (raw === "accepted" || raw === "refused") return raw; // ancien format (string brute)
    const obj = JSON.parse(raw);
    if (obj?.status !== "accepted" && obj?.status !== "refused") return null;
    if (typeof obj.ts === "number" && Date.now() - obj.ts > MAX_AGE_MS) return null; // expiré
    return obj.status;
  } catch { return null; }
}

export function writeConsent(status: "accepted" | "refused") {
  try { localStorage.setItem(KEY, JSON.stringify({ status, ts: Date.now() })); } catch {}
  try { window.dispatchEvent(new Event(EVENT)); } catch {}
}

/** Réactif : true UNIQUEMENT si le consentement « mesure d'audience & publicité » est accepté. */
export function useConsentAccepted(): boolean {
  const [accepted, setAccepted] = useState(false);
  useEffect(() => {
    const update = () => setAccepted(readConsent() === "accepted");
    update();
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return accepted;
}
