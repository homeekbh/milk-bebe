import React from "react";

/**
 * RatingInline (Lot T · cliquable Lot U) — ligne de note compacte :
 *   « ★★★★★  5,0 · 6 avis »
 * SANS `onClick` : purement présentationnelle (aucun hook) → utilisable côté SERVEUR
 * (page.tsx) ET client. AVEC `onClick` (optionnel) : rendue en <button> accessible (le
 * nombre d'avis souligné pour signaler l'action) → ouvre la modale d'avis depuis le
 * client. Chaînes localisées (avgStr, countStr) fournies par l'appelant (source unique :
 * lib/server/product-rating). Le composant N'EST rendu QUE si count > 0 (l'appelant garde
 * sur `rating` non nul) → jamais cliquable à 0 avis. Étoiles en ambre #F5B841 (Lot D).
 */
const AMBER = "#F5B841";
const MUTED = "rgba(26,20,16,0.22)";

export default function RatingInline({ avg, avgStr, countStr, onClick }: { avg: number; avgStr: string; countStr: string; onClick?: () => void }) {
  const filled = Math.max(0, Math.min(5, Math.round(avg)));
  const inner = (
    <>
      <span aria-hidden style={{ display: "inline-flex", letterSpacing: 1 }}>
        {[0, 1, 2, 3, 4].map(i => (
          <span key={i} style={{ color: i < filled ? AMBER : MUTED, fontSize: 14 }}>★</span>
        ))}
      </span>
      <span style={{ fontWeight: 800, color: "#1a1410" }}>{avgStr}</span>
      <span style={{ color: "rgba(26,20,16,0.5)", fontWeight: 600, ...(onClick ? { textDecoration: "underline", textUnderlineOffset: 2 } : null) }}>· {countStr}</span>
    </>
  );
  const base: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, lineHeight: 1 };

  // Cliquable : <button> neutre (styles remis à plat) pour l'accessibilité (clavier, rôle).
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={`${avgStr} · ${countStr} — voir les avis`}
        style={{ ...base, background: "none", border: "none", padding: 0, margin: 0, cursor: "pointer", fontFamily: "inherit" }}>
        {inner}
      </button>
    );
  }
  return <div aria-label={`${avgStr} · ${countStr}`} style={base}>{inner}</div>;
}
