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
import Script from "next/script";
import { Link } from "@/i18n/navigation";
import GTMScript from "@/components/analytics/GTMScript";

const GA4_ID     = process.env.NEXT_PUBLIC_GA4_ID;
const META_PIXEL = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";
const KEY        = "milk_cookie_consent";
const MAX_AGE_MS = 13 * 30 * 24 * 60 * 60 * 1000; // ~13 mois

type Status = "accepted" | "refused" | null;

function readConsent(): Status {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    if (raw === "accepted" || raw === "refused") return raw; // ancien format
    const obj = JSON.parse(raw);
    if (obj?.status !== "accepted" && obj?.status !== "refused") return null;
    if (typeof obj.ts === "number" && Date.now() - obj.ts > MAX_AGE_MS) return null; // expiré
    return obj.status;
  } catch { return null; }
}
function writeConsent(status: "accepted" | "refused") {
  try { localStorage.setItem(KEY, JSON.stringify({ status, ts: Date.now() })); } catch {}
}

export default function ConsentManager() {
  const [ready,   setReady]   = useState(false);
  const [status,  setStatus]  = useState<Status>(null);
  const [show,    setShow]    = useState(false);
  const [custom,  setCustom]  = useState(false);
  const [analytics, setAnalytics] = useState(false); // toggle « personnaliser », décoché par défaut

  useEffect(() => {
    const c = readConsent();
    setStatus(c);
    setReady(true);
    if (!c) setTimeout(() => setShow(true), 1200);
  }, []);

  function decide(s: "accepted" | "refused") {
    writeConsent(s);
    setStatus(s);
    setShow(false);
    setCustom(false);
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
                  Nous respectons votre vie privée
                </div>
                <div style={{ fontSize: 14, color: "rgba(242,237,230,0.55)", lineHeight: 1.7 }}>
                  Les cookies techniques (panier, connexion) sont toujours actifs. Avec votre accord, nous utilisons aussi des cookies de mesure d'audience et de publicité (Google Analytics, Google Tag Manager, Meta Pixel) pour améliorer le site.{" "}
                  <Link href="/politique-confidentialite" style={{ color: "#c49a4a", textDecoration: "underline" }}>
                    En savoir plus
                  </Link>
                </div>
              </div>
            </div>

            {custom && (
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 12, background: "rgba(242,237,230,0.05)", border: "1px solid rgba(242,237,230,0.08)", cursor: "pointer", marginBottom: 16 }}>
                <input type="checkbox" checked={analytics} onChange={e => setAnalytics(e.target.checked)} style={{ width: 18, height: 18, marginTop: 1, flexShrink: 0, accentColor: "#c49a4a" }} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: "#f2ede6" }}>Mesure d'audience &amp; publicité</div>
                  <div style={{ fontSize: 12, color: "rgba(242,237,230,0.45)", marginTop: 2, lineHeight: 1.5 }}>Google Analytics, Google Tag Manager, Meta Pixel. Désactivé par défaut.</div>
                </div>
              </label>
            )}

            {custom ? (
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => decide(analytics ? "accepted" : "refused")}
                  style={{ flex: 1, padding: "13px", borderRadius: 12, background: "#c49a4a", color: "#1a1410", fontWeight: 900, fontSize: 15, border: "none", cursor: "pointer" }}>
                  Enregistrer mes choix
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={() => decide("accepted")}
                  style={{ flex: "1 1 120px", padding: "13px", borderRadius: 12, background: "#c49a4a", color: "#1a1410", fontWeight: 900, fontSize: 15, border: "none", cursor: "pointer" }}>
                  Tout accepter
                </button>
                <button onClick={() => decide("refused")}
                  style={{ flex: "1 1 120px", padding: "13px", borderRadius: 12, background: "rgba(242,237,230,0.08)", color: "rgba(242,237,230,0.6)", fontWeight: 700, fontSize: 15, border: "1px solid rgba(242,237,230,0.1)", cursor: "pointer" }}>
                  Tout refuser
                </button>
                <button onClick={() => { setCustom(true); }}
                  style={{ flex: "1 1 120px", padding: "13px", borderRadius: 12, background: "transparent", color: "rgba(242,237,230,0.5)", fontWeight: 700, fontSize: 14, border: "1px solid rgba(242,237,230,0.1)", cursor: "pointer" }}>
                  Personnaliser
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
