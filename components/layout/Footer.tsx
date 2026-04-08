"use client";

import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={{ background: "#0d0b09", borderTop: "1px solid rgba(240,237,232,0.08)", color: "#f0ede8" }}>

      {/* ── CORPS ──────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "72px 6vw 48px", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48 }}>

        {/* Brand */}
        <div style={{ display: "grid", gap: 20, alignContent: "start" }}>
          <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: -1.5 }}>M!LK</div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, color: "rgba(240,237,232,0.45)", maxWidth: 280 }}>
            L'exigence premium pour la peau la plus fragile. Bambou certifié OEKO-TEX, conçu pour la vraie vie avec bébé.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <a href="https://instagram.com/milk_bebe" target="_blank" rel="noopener noreferrer" style={{ padding: "8px 16px", borderRadius: 99, border: "1px solid rgba(240,237,232,0.12)", color: "rgba(240,237,232,0.55)", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
              Instagram
            </a>
            <a href="https://facebook.com/milkbebe" target="_blank" rel="noopener noreferrer" style={{ padding: "8px 16px", borderRadius: 99, border: "1px solid rgba(240,237,232,0.12)", color: "rgba(240,237,232,0.55)", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
              Facebook
            </a>
          </div>
        </div>

        {/* Collection */}
        <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2.5, textTransform: "uppercase", color: "rgba(240,237,232,0.35)", marginBottom: 4 }}>Collection</div>
          <Link href="/produits" style={{ fontSize: 14, color: "rgba(240,237,232,0.55)", textDecoration: "none", fontWeight: 500 }}>Tous les produits</Link>
          <Link href="/categorie/bodies" style={{ fontSize: 14, color: "rgba(240,237,232,0.55)", textDecoration: "none", fontWeight: 500 }}>Bodies</Link>
          <Link href="/categorie/pyjamas" style={{ fontSize: 14, color: "rgba(240,237,232,0.55)", textDecoration: "none", fontWeight: 500 }}>Pyjamas</Link>
          <Link href="/categorie/gigoteuses" style={{ fontSize: 14, color: "rgba(240,237,232,0.55)", textDecoration: "none", fontWeight: 500 }}>Gigoteuses</Link>
          <Link href="/categorie/accessoires" style={{ fontSize: 14, color: "rgba(240,237,232,0.55)", textDecoration: "none", fontWeight: 500 }}>Accessoires</Link>
        </div>

        {/* La marque */}
        <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2.5, textTransform: "uppercase", color: "rgba(240,237,232,0.35)", marginBottom: 4 }}>La marque</div>
          <Link href="/qui-sommes-nous" style={{ fontSize: 14, color: "rgba(240,237,232,0.55)", textDecoration: "none", fontWeight: 500 }}>Qui sommes-nous</Link>
          <Link href="/pourquoi-bambou" style={{ fontSize: 14, color: "rgba(240,237,232,0.55)", textDecoration: "none", fontWeight: 500 }}>Pourquoi le bambou</Link>
          <Link href="/qui-sommes-nous" style={{ fontSize: 14, color: "rgba(240,237,232,0.55)", textDecoration: "none", fontWeight: 500 }}>Notre engagement</Link>
        </div>

        {/* Aide */}
        <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2.5, textTransform: "uppercase", color: "rgba(240,237,232,0.35)", marginBottom: 4 }}>Aide & infos</div>
          <Link href="/profil" style={{ fontSize: 14, color: "rgba(240,237,232,0.55)", textDecoration: "none", fontWeight: 500 }}>Mon compte</Link>
          <Link href="/livraison" style={{ fontSize: 14, color: "rgba(240,237,232,0.55)", textDecoration: "none", fontWeight: 500 }}>Livraison & retours</Link>
          <Link href="/cgv" style={{ fontSize: 14, color: "rgba(240,237,232,0.55)", textDecoration: "none", fontWeight: 500 }}>CGV</Link>
          <Link href="/mentions-legales" style={{ fontSize: 14, color: "rgba(240,237,232,0.55)", textDecoration: "none", fontWeight: 500 }}>Mentions légales</Link>
          <Link href="/mentions-legales#cookies" style={{ fontSize: 14, color: "rgba(240,237,232,0.55)", textDecoration: "none", fontWeight: 500 }}>Politique de cookies</Link>
        </div>
      </div>

      {/* ── NEWSLETTER ─────────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid rgba(240,237,232,0.08)", borderBottom: "1px solid rgba(240,237,232,0.08)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 6vw", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 4 }}>La newsletter M!LK</div>
            <div style={{ fontSize: 13, color: "rgba(240,237,232,0.45)" }}>Nouveautés, offres exclusives, conseils bébé.</div>
          </div>
          <div style={{ display: "flex", background: "rgba(240,237,232,0.06)", borderRadius: 12, border: "1px solid rgba(240,237,232,0.1)", overflow: "hidden" }}>
            <input
              type="email"
              placeholder="ton@email.com"
              style={{ padding: "13px 18px", background: "transparent", border: "none", outline: "none", color: "#f0ede8", fontSize: 14, minWidth: 240 }}
            />
            <button style={{ padding: "13px 22px", background: "#f0ede8", color: "#000", fontWeight: 900, fontSize: 13, border: "none", cursor: "pointer" }}>
              {"S'inscrire →"}
            </button>
          </div>
        </div>
      </div>

      {/* ── BAS DE PAGE ────────────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 6vw", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontSize: 12, color: "rgba(240,237,232,0.3)", fontWeight: 500 }}>
          © {year} M!LK — Tous droits réservés.
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          <Link href="/cgv" style={{ fontSize: 12, color: "rgba(240,237,232,0.3)", textDecoration: "none", fontWeight: 500 }}>CGV</Link>
          <Link href="/mentions-legales" style={{ fontSize: 12, color: "rgba(240,237,232,0.3)", textDecoration: "none", fontWeight: 500 }}>Mentions légales</Link>
          <Link href="/mentions-legales#cookies" style={{ fontSize: 12, color: "rgba(240,237,232,0.3)", textDecoration: "none", fontWeight: 500 }}>Cookies</Link>
        </div>
        <div style={{ fontSize: 12, color: "rgba(240,237,232,0.2)", fontWeight: 500 }}>
          🌿 100% Bambou · OEKO-TEX · Made with care
        </div>
      </div>

      {/* ── CRÉDIT BHK ─────────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid rgba(240,237,232,0.05)", padding: "14px 6vw", display: "flex", justifyContent: "center", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "rgba(240,237,232,0.18)", fontWeight: 500 }}>
          Design {"&"} création par{" "}
          <strong style={{ color: "rgba(240,237,232,0.3)" }}>BHK — Design {"&"} Graphisme</strong>
        </span>
        <span style={{ fontSize: 11, color: "rgba(240,237,232,0.1)" }}>·</span>
        <a href="tel:+33745272134" style={{ fontSize: 11, color: "rgba(240,237,232,0.25)", fontWeight: 600, textDecoration: "none", letterSpacing: 0.3 }}>
          07 45 27 21 34
        </a>
      </div>

    </footer>
  );
}