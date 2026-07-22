"use client";

/**
 * ConsentManager — bannière de consentement cookies RGPD/CNIL + chargement CONDITIONNEL
 * du tracking. GTM, GA4 et Meta Pixel ne sont montés QUE si le visiteur a explicitement
 * accepté (rien n'est pré-coché). Refus / pas de choix → aucun de ces scripts n'est chargé.
 *
 * - Choix explicite : Accepter / Refuser / Personnaliser (un seul bucket « mesure
 *   d'audience & publicité », décoché par défaut, car GTM/GA4/Meta sont couplés).
 * - Mémorisation : localStorage `milk_cookie_consent` = { status, ts }. Validité 13 mois
 *   (recommandation CNIL) → au-delà, on redemande. Rétro-compatible avec l'ancien format
 *   (string brute "accepted"/"refused").
 * - PageTracker (mesure d'audience 1st-party, base propre) reste hors de ce périmètre.
 */

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Script from "next/script";
import { Link } from "@/i18n/navigation";
import GTMScript from "@/components/analytics/GTMScript";
// Lecture/écriture du consentement extraites en source UNIQUE (réutilisées par
// MerchantBadge / GoogleCustomerReviews). writeConsent y émet aussi un événement pour
// que les autres chargements tiers réagissent au choix. Le gating ci-dessous des 3
// traceurs (GTM/GA4/Pixel) est INCHANGÉ (toujours `status === "accepted"`).
import { readConsent, writeConsent, onOpenConsent, type ConsentStatus } from "@/components/analytics/consent-store";

const GA4_ID     = process.env.NEXT_PUBLIC_GA4_ID;
const META_PIXEL = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";

type Status = ConsentStatus;

export default function ConsentManager() {
  const [ready,   setReady]   = useState(false);
  const [status,  setStatus]  = useState<Status>(null);
  const [show,    setShow]    = useState(false);
  const [custom,  setCustom]  = useState(false);
  const [analytics, setAnalytics] = useState(false); // toggle « personnaliser », décoché par défaut
  const t = useTranslations("consent");

  useEffect(() => {
    const c = readConsent();
    setStatus(c);
    setReady(true);
    if (!c) setTimeout(() => setShow(true), 1200);
  }, []);

  // « Gérer mes cookies » (footer) → ré-ouvre la bannière même si un choix existe déjà,
  // pour permettre de le modifier ou de le retirer (RGPD art. 7-3). Pré-coche le toggle
  // selon le choix courant pour le mode « Personnaliser ».
  useEffect(() => onOpenConsent(() => {
    setAnalytics(readConsent() === "accepted");
    setCustom(false);
    setShow(true);
  }), []);

  function decide(s: "accepted" | "refused") {
    writeConsent(s);      // persiste le choix AVANT tout reload (localStorage synchrone)
    setStatus(s);
    setShow(false);
    setCustom(false);
    // Refus / retrait : recharger pour STOPPER immédiatement GA4/GTM/Meta Pixel déjà chargés
    // dans la session (sinon ils ne cessent qu'au prochain chargement). Pas de reload sur
    // « accepter » (inutile). Le choix "refused" est déjà enregistré ci-dessus.
    if (s === "refused") {
      try { window.location.reload(); } catch {}
    }
  }

  return (
    <>
      {/* Tracking tiers — monté UNIQUEMENT après consentement explicite « accepté ». */}
      {ready && status === "accepted" && (
        <>
          <GTMScript />
          {GA4_ID && (
            <>
              <Script id="ga4" strategy="afterInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`} />
              <Script id="ga4-init" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA4_ID}', { page_path: window.location.pathname });
              ` }} />
            </>
          )}
          {META_PIXEL && (
            <Script id="meta-pixel" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `
              !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
              n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${META_PIXEL}');
              fbq('track', 'PageView');
            ` }} />
          )}
        </>
      )}

      {ready && show && (
        <div style={{ position: "fixed", bottom: 24, left: 24, right: 24, zIndex: 9990, maxWidth: 520, margin: "0 auto" }}>
          <div style={{ background: "#1a1410", borderRadius: 20, border: "1px solid rgba(196,154,74,0.2)", padding: "24px 28px", boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                <circle cx="12" cy="12" r="9" stroke="#c49a4a" strokeWidth="1.8" />
                <path d="M12 8v4M12 16h.01" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <div>
                <div style={{ fontWeight: 900, fontSize: 16, color: "#f2ede6", marginBottom: 8 }}>
                  {t("title")}
                </div>
                <div style={{ fontSize: 14, color: "rgba(242,237,230,0.55)", lineHeight: 1.7 }}>
                  {t("body")}{" "}
                  <Link href="/politique-confidentialite" style={{ color: "#c49a4a", textDecoration: "underline" }}>
                    {t("learn_more")}
                  </Link>
                </div>
              </div>
            </div>

            {custom && (
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 12, background: "rgba(242,237,230,0.05)", border: "1px solid rgba(242,237,230,0.08)", cursor: "pointer", marginBottom: 16 }}>
                <input type="checkbox" checked={analytics} onChange={e => setAnalytics(e.target.checked)} style={{ width: 18, height: 18, marginTop: 1, flexShrink: 0, accentColor: "#c49a4a" }} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: "#f2ede6" }}>{t("bucket_title")}</div>
                  <div style={{ fontSize: 12, color: "rgba(242,237,230,0.45)", marginTop: 2, lineHeight: 1.5 }}>{t("bucket_desc")}</div>
                </div>
              </label>
            )}

            {custom ? (
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => decide(analytics ? "accepted" : "refused")}
                  style={{ flex: 1, padding: "13px", borderRadius: 12, background: "#c49a4a", color: "#1a1410", fontWeight: 900, fontSize: 15, border: "none", cursor: "pointer" }}>
                  {t("save")}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={() => decide("accepted")}
                  style={{ flex: "1 1 120px", padding: "13px", borderRadius: 12, background: "#c49a4a", color: "#1a1410", fontWeight: 900, fontSize: 15, border: "none", cursor: "pointer" }}>
                  {t("accept_all")}
                </button>
                <button onClick={() => decide("refused")}
                  style={{ flex: "1 1 120px", padding: "13px", borderRadius: 12, background: "rgba(242,237,230,0.08)", color: "rgba(242,237,230,0.6)", fontWeight: 700, fontSize: 15, border: "1px solid rgba(242,237,230,0.1)", cursor: "pointer" }}>
                  {t("refuse_all")}
                </button>
                <button onClick={() => { setCustom(true); }}
                  style={{ flex: "1 1 120px", padding: "13px", borderRadius: 12, background: "transparent", color: "rgba(242,237,230,0.5)", fontWeight: 700, fontSize: 14, border: "1px solid rgba(242,237,230,0.1)", cursor: "pointer" }}>
                  {t("customize")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
