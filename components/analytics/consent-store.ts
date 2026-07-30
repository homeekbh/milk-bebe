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
 *
 * Lot M3 — MIROIR COOKIE `milk_consent` (accepted|refused) : localStorage n'est pas
 * lisible côté serveur ; on écrit donc EN PLUS un cookie non-httpOnly que le serveur
 * (create-session) peut relire. localStorage reste la SOURCE DE VÉRITÉ de l'affichage ;
 * le cookie n'en est qu'un reflet. Écrit à chaque writeConsent + posé au montage
 * depuis un statut localStorage préexistant (reprise des visiteurs déjà passés).
 */

import { useEffect, useState } from "react";

export type ConsentStatus = "accepted" | "refused" | null;

const KEY        = "milk_cookie_consent";
const MAX_AGE_MS = 13 * 30 * 24 * 60 * 60 * 1000; // ~13 mois (recommandation CNIL)
const EVENT      = "milk-consent-changed";
const OPEN_EVENT = "milk-open-consent"; // demande de ré-ouverture de la bannière (art. 7-3)

// ── Miroir cookie lisible côté serveur (Lot M3) ──────────────────────────────
const COOKIE          = "milk_consent";
const COOKIE_MAX_AGE_S = 60 * 60 * 24 * 365; // 1 an
function writeConsentCookie(status: "accepted" | "refused") {
  if (typeof document === "undefined") return;
  try {
    // Secure UNIQUEMENT en https (sinon le cookie serait rejeté en dev http).
    const secure = (typeof location !== "undefined" && location.protocol === "https:") ? "; Secure" : "";
    document.cookie = `${COOKIE}=${status}; path=/; max-age=${COOKIE_MAX_AGE_S}; SameSite=Lax${secure}`;
  } catch { /* cookies bloqués → ignoré */ }
}

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
  writeConsentCookie(status); // Lot M3 : miroir serveur, écrit en même temps que localStorage
  try { window.dispatchEvent(new Event(EVENT)); } catch {}
}

/**
 * Lot M3 — Reprise : pose le cookie miroir depuis le statut localStorage EXISTANT.
 * Pour les visiteurs déjà passés (choix en localStorage mais cookie pas encore posé),
 * à appeler AU MONTAGE. Idempotent (rafraîchit juste le TTL) ; ne pose RIEN si aucun
 * choix n'a encore été fait (statut null).
 */
export function syncConsentCookie() {
  const status = readConsent();
  if (status === "accepted" || status === "refused") writeConsentCookie(status);
}

/**
 * Ré-ouvre la bannière de consentement (RGPD art. 7-3 : retrait/modification du
 * consentement à tout moment) SANS effacer le choix déjà stocké — l'utilisateur
 * pourra le confirmer ou le changer. Utilisé par le lien « Gérer mes cookies ».
 */
export function openConsentBanner() {
  try { window.dispatchEvent(new Event(OPEN_EVENT)); } catch {}
}

/** S'abonne à la demande de ré-ouverture ; renvoie la fonction de désabonnement. */
export function onOpenConsent(handler: () => void): () => void {
  window.addEventListener(OPEN_EVENT, handler);
  return () => window.removeEventListener(OPEN_EVENT, handler);
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
