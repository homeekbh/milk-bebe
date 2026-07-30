import React from "react";

/**
 * RatingInline (Lot T) — ligne de note compacte NON cliquable :
 *   « ★★★★★  5,0 · 6 avis »
 * Purement présentationnelle (aucun hook) → utilisable côté SERVEUR (page.tsx)
 * ET côté client (ProductClient). Les chaînes localisées (avgStr, countStr) sont
 * fournies par l'appelant (une seule source pour la note : cf. lib/server/product-rating).
 * Étoiles en ambre #F5B841 (cohérent avec les pastilles du Lot D).
 */
const AMBER = "#F5B841";
const MUTED = "rgba(26,20,16,0.22)";

export default function RatingInline({ avg, avgStr, countStr }: { avg: number; avgStr: string; countStr: string }) {
  const filled = Math.max(0, Math.min(5, Math.round(avg)));
  return (
    <div aria-label={`${avgStr} · ${countStr}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, lineHeight: 1 }}>
      <span aria-hidden style={{ display: "inline-flex", letterSpacing: 1 }}>
        {[0, 1, 2, 3, 4].map(i => (
          <span key={i} style={{ color: i < filled ? AMBER : MUTED, fontSize: 14 }}>★</span>
        ))}
      </span>
      <span style={{ fontWeight: 800, color: "#1a1410" }}>{avgStr}</span>
      <span style={{ color: "rgba(26,20,16,0.5)", fontWeight: 600 }}>· {countStr}</span>
    </div>
  );
}
