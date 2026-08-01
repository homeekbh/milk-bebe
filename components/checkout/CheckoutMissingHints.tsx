"use client";

/**
 * Bloc d'alerte ambre DISCRET listant les conditions non satisfaites qui gardent
 * un bouton d'action désactivé. Purement présentationnel : ne dérive rien lui-même,
 * il reçoit la liste déjà calculée par la page. Rendu uniquement si `items` non vide.
 *
 * Charte : accent #c49a4a, fond rgba(196,154,74,0.08) — jamais le rouge agressif.
 */
export default function CheckoutMissingHints({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div
      role="status"
      style={{
        marginTop: 12, padding: "12px 14px", borderRadius: 12,
        background: "rgba(196,154,74,0.08)", border: "1px solid rgba(196,154,74,0.35)",
        color: "#8a6d2f", fontSize: 13, fontWeight: 700, lineHeight: 1.6,
        display: "grid", gap: 4,
      }}
    >
      {items.map((m, i) => (
        <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <span aria-hidden style={{ color: "#c49a4a" }}>•</span>
          <span>{m}</span>
        </div>
      ))}
    </div>
  );
}
