"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("milk_cookie_consent");
    if (!consent) setTimeout(() => setShow(true), 1500);
  }, []);

  function accept() {
    localStorage.setItem("milk_cookie_consent", "accepted");
    setShow(false);
  }

  function refuse() {
    localStorage.setItem("milk_cookie_consent", "refused");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div style={{ position: "fixed", bottom: 24, left: 24, right: 24, zIndex: 9990, maxWidth: 520, margin: "0 auto" }}>
      <div style={{ background: "#1a1410", borderRadius: 20, border: "1px solid rgba(196,154,74,0.2)", padding: "24px 28px", boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
            <circle cx="12" cy="12" r="9" stroke="#c49a4a" strokeWidth="1.8" />
            <path d="M12 8v4M12 16h.01" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16, color: "#f2ede6", marginBottom: 8 }}>
              Nous respectons votre vie privée
            </div>
            <div style={{ fontSize: 14, color: "rgba(242,237,230,0.55)", lineHeight: 1.7 }}>
              Nous utilisons uniquement des cookies techniques nécessaires au bon fonctionnement du site (panier, connexion). Aucun cookie publicitaire.{" "}
              <Link href="/politique-confidentialite" style={{ color: "#c49a4a", textDecoration: "underline" }}>
                En savoir plus
              </Link>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={accept}
            style={{ flex: 1, padding: "13px", borderRadius: 12, background: "#c49a4a", color: "#1a1410", fontWeight: 900, fontSize: 15, border: "none", cursor: "pointer" }}
          >
            Accepter
          </button>
          <button
            onClick={refuse}
            style={{ flex: 1, padding: "13px", borderRadius: 12, background: "rgba(242,237,230,0.08)", color: "rgba(242,237,230,0.6)", fontWeight: 700, fontSize: 15, border: "1px solid rgba(242,237,230,0.1)", cursor: "pointer" }}
          >
            Refuser
          </button>
        </div>
      </div>
    </div>
  );
}