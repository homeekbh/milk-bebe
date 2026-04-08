// app/not-found.tsx

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page introuvable | M!LK",
  description: "Cette page n'existe pas. Découvrez la collection M!LK — vêtements bébé en bambou premium.",
};

export default function NotFound() {
  return (
    <div style={{
      background: "#0d0b09",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
      textAlign: "center",
      overflow: "hidden",
      position: "relative",
    }}>

      {/* Fond texturé */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "url('/matiere/bambou-02.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        opacity: 0.04,
      }} />

      {/* Glow ambiant */}
      <div style={{
        position: "absolute",
        top: "30%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 600, height: 600,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(200,147,58,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* 404 géant */}
      <div style={{
        position: "relative", zIndex: 2,
        fontSize: "clamp(100px, 25vw, 260px)",
        fontWeight: 950,
        letterSpacing: -10,
        lineHeight: 1,
        color: "rgba(240,237,232,0.06)",
        userSelect: "none",
        marginBottom: -20,
      }}>
        404
      </div>

      {/* Contenu central */}
      <div style={{ position: "relative", zIndex: 3, maxWidth: 480, display: "grid", gap: 20 }}>

        {/* Logo */}
        <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: -1, color: "#f0ede8", marginBottom: 4 }}>
          M!LK
        </div>

        <h1 style={{
          margin: 0,
          fontSize: "clamp(24px, 4vw, 40px)",
          fontWeight: 950,
          letterSpacing: -1.5,
          lineHeight: 1.1,
          color: "#f0ede8",
        }}>
          Cette page n'existe pas.
        </h1>

        <p style={{
          margin: 0,
          fontSize: 16,
          lineHeight: 1.75,
          color: "rgba(240,237,232,0.45)",
        }}>
          Elle a peut-être été déplacée, supprimée, ou l'adresse est incorrecte.
          Pas d'inquiétude — les essentiels M!LK sont toujours là.
        </p>

        {/* Liens rapides */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 8 }}>
          <Link href="/" style={{
            padding: "14px 28px", borderRadius: 12,
            background: "#f0ede8", color: "#000",
            fontWeight: 900, fontSize: 15, textDecoration: "none",
          }}>
            Accueil
          </Link>
          <Link href="/produits" style={{
            padding: "14px 28px", borderRadius: 12,
            border: "1px solid rgba(240,237,232,0.15)",
            color: "#f0ede8",
            fontWeight: 800, fontSize: 15, textDecoration: "none",
          }}>
            Voir les produits →
          </Link>
        </div>

        {/* Séparateur */}
        <div style={{ height: 1, background: "rgba(240,237,232,0.08)", margin: "8px 0" }} />

        {/* Raccourcis catégories */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          {[
            { label: "Bodies",      href: "/categorie/bodies" },
            { label: "Pyjamas",     href: "/categorie/pyjamas" },
            { label: "Gigoteuses",  href: "/categorie/gigoteuses" },
          ].map((c) => (
            <Link key={c.href} href={c.href} style={{
              padding: "8px 16px", borderRadius: 99,
              background: "rgba(240,237,232,0.06)",
              border: "1px solid rgba(240,237,232,0.1)",
              color: "rgba(240,237,232,0.55)",
              fontWeight: 700, fontSize: 13, textDecoration: "none",
            }}>
              {c.label}
            </Link>
          ))}
        </div>

      </div>

      {/* Bottom hint */}
      <div style={{
        position: "absolute", bottom: 32,
        fontSize: 12,
        color: "rgba(240,237,232,0.2)",
        fontWeight: 600,
        letterSpacing: 1,
        zIndex: 2,
      }}>
        © {new Date().getFullYear()} M!LK — Bambou certifié OEKO-TEX
      </div>

    </div>
  );
}