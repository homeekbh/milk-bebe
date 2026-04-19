"use client";

import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={{ background: "#1a1210", borderTop: "1px solid rgba(242,237,230,0.07)", color: "#f0ede8" }}>

      <div style={{ maxWidth: 1600, margin: "0 auto", padding: "60px 5vw 40px", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "40px 48px" }}>
        <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
          <div style={{ fontSize: 26, fontWeight: 950, letterSpacing: -1.5, color: "#f2ede6" }}>
            M<span style={{ color: "#c49a4a" }}>!</span>LK
          </div>
          {/* ✅ Tagline Erika */}
          <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#c49a4a", letterSpacing: -0.3 }}>
            Des essentiels bébé. Sans le superflu.
          </p>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, color: "rgba(242,237,230,0.4)", maxWidth: 280 }}>
            Chaque produit M!LK répond à un problème réel. Pas de design pour le design. Juste ce qui compte quand t'es épuisé.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <a href="https://instagram.com/milk_bebe" target="_blank" rel="noopener noreferrer"
              style={{ padding: "8px 16px", borderRadius: 99, border: "1px solid rgba(242,237,230,0.12)", color: "rgba(242,237,230,0.5)", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
              Instagram
            </a>
            <a href="https://facebook.com/milkbebe" target="_blank" rel="noopener noreferrer"
              style={{ padding: "8px 16px", borderRadius: 99, border: "1px solid rgba(242,237,230,0.12)", color: "rgba(242,237,230,0.5)", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
              Facebook
            </a>
          </div>
        </div>

        <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2.5, textTransform: "uppercase", color: "rgba(242,237,230,0.3)", marginBottom: 2 }}>Collection</div>
          {[
            { label: "Tous les produits", href: "/produits" },
            { label: "Bodies",            href: "/categorie/bodies" },
            { label: "Pyjamas",           href: "/categorie/pyjamas" },
            { label: "Gigoteuses",        href: "/categorie/gigoteuses" },
            { label: "Accessoires",       href: "/categorie/accessoires" },
          ].map(l => <Link key={l.href} href={l.href} style={{ fontSize: 14, color: "rgba(242,237,230,0.5)", textDecoration: "none", fontWeight: 500 }}>{l.label}</Link>)}
        </div>

        <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2.5, textTransform: "uppercase", color: "rgba(242,237,230,0.3)", marginBottom: 2 }}>La marque</div>
          {[
            { label: "Notre histoire",    href: "/qui-sommes-nous" },
            { label: "Pourquoi le bambou",href: "/pourquoi-bambou" },
            { label: "Notre engagement",  href: "/qui-sommes-nous" },
          ].map(l => <Link key={l.href+l.label} href={l.href} style={{ fontSize: 14, color: "rgba(242,237,230,0.5)", textDecoration: "none", fontWeight: 500 }}>{l.label}</Link>)}
        </div>

        <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2.5, textTransform: "uppercase", color: "rgba(242,237,230,0.3)", marginBottom: 2 }}>Support</div>
          {[
            { label: "Mon compte",         href: "/profil" },
            { label: "Livraison & retours",href: "/livraison" },
            { label: "CGV",                href: "/cgv" },
            { label: "Mentions légales",   href: "/mentions-legales" },
            { label: "Politique cookies",  href: "/politique-confidentialite" },
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
          <div style={{ display: "flex", background: "rgba(242,237,230,0.06)", borderRadius: 12, border: "1px solid rgba(242,237,230,0.1)", overflow: "hidden" }}>
            <input type="email" placeholder="ton@email.com"
              style={{ padding: "12px 18px", background: "transparent", border: "none", outline: "none", color: "#f0ede8", fontSize: 14, minWidth: 220 }} />
            <button style={{ padding: "12px 20px", background: "#c49a4a", color: "#1a1410", fontWeight: 900, fontSize: 13, border: "none", cursor: "pointer" }}>
              S'inscrire →
            </button>
          </div>
        </div>
      </div>

      {/* Bas */}
      <div style={{ maxWidth: 1600, margin: "0 auto", padding: "20px 5vw", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        {/* ✅ Copyright Erika */}
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