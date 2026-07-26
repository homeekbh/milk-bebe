"use client";

import { useEffect, useRef } from "react";

/**
 * Modale générique réutilisable — overlay + panneau centré, charte M!LK.
 * Fermeture : clic hors du panneau, touche Échap, bouton ×. Accessible :
 * role="dialog" aria-modal, focus posé sur le panneau à l'ouverture (piège
 * de focus simple), scroll de fond bloqué. S'inspire de l'overlay de
 * RelaySelector mais sans logique métier (présentation pure).
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 560,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: number;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const focusTimer = setTimeout(() => panelRef.current?.focus(), 0);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // bloque le scroll de fond
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(focusTimer);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      role="presentation"
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 18, maxWidth, width: "100%", maxHeight: "90vh", overflow: "auto", padding: 24, boxShadow: "0 24px 60px rgba(0,0,0,0.4)", outline: "none" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 950, color: "#1a1410", letterSpacing: -0.5 }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{ background: "none", border: "none", fontSize: 26, lineHeight: 1, cursor: "pointer", color: "rgba(26,20,16,0.4)", padding: 0, width: 32, height: 32, flexShrink: 0 }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
