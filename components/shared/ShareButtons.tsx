"use client";
import { useState } from "react";

/* Boutons "Copier le lien" + "Partager" avec toast interne. Réutilisable
   (fiche produit, pack). Copie l'URL courante. */
export default function ShareButtons({ title = "M!LK" }: { title?: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href).then(
      () => { setCopied(true); setTimeout(() => setCopied(false), 2000); },
      () => {}
    );
  }
  async function share() {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try { await (navigator as any).share({ title, url: window.location.href }); } catch { /* annulé */ }
    } else {
      copy();
    }
  }

  const btn: React.CSSProperties = {
    flex: 1, padding: "12px 16px", borderRadius: 12, background: "transparent",
    color: "rgba(26,20,16,0.55)", fontWeight: 700, fontSize: 14,
    border: "1.5px solid rgba(26,20,16,0.15)", cursor: "pointer",
  };

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button onClick={copy} style={btn}>{copied ? "✓ Lien copié !" : "📋 Copier le lien"}</button>
      <button onClick={share} style={btn}>Partager</button>
    </div>
  );
}
