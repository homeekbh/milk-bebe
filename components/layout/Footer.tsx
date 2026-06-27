"use client";

import { Link } from "@/i18n/navigation";
import { useState } from "react";
import PaymentMethods from "./PaymentMethods";

export default function Footer() {
  const year = new Date().getFullYear();

  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState("");

  async function handleSubscribe() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setError("Email invalide"); return;
    }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim(), source: "footer" }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
    } catch {
      setError("Une erreur est survenue, réessaie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <footer style={{ background: "#1a1210", borderTop: "1px solid rgba(242,237,230,0.07)", color: "#f0ede8" }}>

      <div style={{ maxWidth: 1600, margin: "0 auto", padding: "60px 5vw 40px", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "40px 48px" }}>
        <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
          <div style={{ fontSize: 26, fontWeight: 950, letterSpacing: -1.5, color: "#f2ede6" }}>
            M<span style={{ color: "#c49a4a" }}>!</span>LK
          </div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#c49a4a", letterSpacing: -0.3 }}>
            Des essentiels bébé. Sans le superflu.
          </p>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, color: "rgba(242,237,230,0.4)", maxWidth: 280 }}>
            Chaque produit M!LK répond à un problème réel. Pas de design pour le design. Juste ce qui compte quand t'es épuisé.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <a href="https://instagram.com/milkbebe.fr" target="_blank" rel="noopener noreferrer"
              style={{ padding: "8px 16px", borderRadius: 99, border: "1px solid rgba(242,237,230,0.12)", color: "rgba(242,237,230,0.5)", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
              Instagram
            </a>
          </div>
        </div>

        <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2.5, textTransform: "uppercase", color: "rgba(242,237,230,0.3)", marginBottom: 2 }}>Collection</div>
          {[
            { label: "Tous les produits",    href: "/produits" },
            { label: "Bodies bébé bambou",   href: "/categorie/bodies" },
            { label: "Pyjamas bébé bambou",  href: "/categorie/pyjamas" },
            { label: "Gigoteuse à nouer bambou bébé", href: "/categorie/gigoteuses" },
            { label: "Accessoires bébé bambou", href: "/categorie/accessoires" },
          ].map(l => <Link key={l.href} href={l.href} style={{ fontSize: 14, color: "rgba(242,237,230,0.5)", textDecoration: "none", fontWeight: 500 }}>{l.label}</Link>)}
        </div>

        <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2.5, textTransform: "uppercase", color: "rgba(242,237,230,0.3)", marginBottom: 2 }}>La marque</div>
          {[
            { label: "Notre histoire",     href: "/qui-sommes-nous" },
            { label: "Pourquoi le bambou", href: "/pourquoi-bambou" },
            { label: "Notre engagement",   href: "/qui-sommes-nous" },
          ].map(l => <Link key={l.href+l.label} href={l.href} style={{ fontSize: 14, color: "rgba(242,237,230,0.5)", textDecoration: "none", fontWeight: 500 }}>{l.label}</Link>)}
        </div>

        <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2.5, textTransform: "uppercase", color: "rgba(242,237,230,0.3)", marginBottom: 2 }}>Support</div>
          {[
            { label: "Mon compte",          href: "/profil" },
            { label: "Livraison & retours", href: "/livraison" },
            { label: "FAQ",                 href: "/faq" },
            { label: "CGV",                 href: "/cgv" },
            { label: "Mentions légales",    href: "/mentions-legales" },
            { label: "Politique cookies",   href: "/politique-confidentialite" },
          ].map(l => <Link key={l.href} href={l.href} style={{ fontSize: 14, color: "rgba(242,237,230,0.5)", textDecoration: "none", fontWeight: 500 }}>{l.label}</Link>)}
        </div>
      </div>

      {/* Newsletter */}
      <div style={{ borderTop: "1px solid rgba(242,237,230,0.07)", borderBottom: "1px solid rgba(242,237,230,0.07)" }}>
        <div style={{ maxWidth: 1600, margin: "0 auto", padding: "28px 5vw", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 3, color: "#f2ede6" }}>La newsletter M!LK</div>
            <div style={{ fontSize: 13, color: "rgba(242,237,230,0.4)" }}>Nouveautés, offres exclusives, conseils bébé.</div>
          </div>
          {done ? (
            <div style={{ padding: "12px 24px", borderRadius: 12, background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e", fontWeight: 800, fontSize: 14 }}>
              ✓ Inscription confirmée !
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
              <div style={{ display: "flex", background: "rgba(242,237,230,0.06)", borderRadius: 12, border: `1px solid ${error ? "rgba(239,68,68,0.5)" : "rgba(242,237,230,0.1)"}`, overflow: "hidden" }}>
                <input
                  type="email"
                  placeholder="ton@email.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleSubscribe()}
                  style={{ padding: "12px 18px", background: "transparent", border: "none", outline: "none", color: "#f0ede8", fontSize: 14, minWidth: 220 }}
                />
                <button
                  onClick={handleSubscribe}
                  disabled={loading}
                  style={{ padding: "12px 20px", background: "#c49a4a", color: "#1a1410", fontWeight: 900, fontSize: 13, border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
                  {loading ? "..." : "S'inscrire →"}
                </button>
              </div>
              {error && <div style={{ fontSize: 12, color: "#ef4444", fontWeight: 700 }}>⚠ {error}</div>}
            </div>
          )}
        </div>
      </div>

      {/* Paiements sécurisés */}
      <PaymentMethods />

      {/* Bas */}
      <div style={{ maxWidth: 1600, margin: "0 auto", padding: "20px 5vw", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 12, color: "rgba(242,237,230,0.28)", fontWeight: 500 }}>
          © {year} M!LK — Moins de galères. Plus de moments.
        </div>
        <div style={{ display: "flex", gap: 18 }}>
          {[
            { label: "CGV",              href: "/cgv" },
            { label: "Mentions légales", href: "/mentions-legales" },
            { label: "Cookies",          href: "/politique-confidentialite" },
          ].map(l => <Link key={l.href} href={l.href} style={{ fontSize: 12, color: "rgba(242,237,230,0.28)", textDecoration: "none", fontWeight: 500 }}>{l.label}</Link>)}
        </div>
        <div style={{ fontSize: 12, color: "rgba(242,237,230,0.18)", fontWeight: 500 }}>
          Des essentiels bébé. Sans le superflu.
        </div>
      </div>

      <div style={{ borderTop: "1px solid rgba(242,237,230,0.05)", padding: "12px 5vw", display: "flex", justifyContent: "center" }}>
        <span style={{ fontSize: 11, color: "rgba(242,237,230,0.16)", fontWeight: 500 }}>
          Design & création par <strong style={{ color: "rgba(242,237,230,0.28)" }}>BHK — Design & Graphisme</strong>
        </span>
      </div>

      <style>{`
        @media (max-width: 768px) { footer > div:first-child { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 480px) { footer > div:first-child { grid-template-columns: 1fr !important; } }
      `}</style>
    </footer>
  );
}