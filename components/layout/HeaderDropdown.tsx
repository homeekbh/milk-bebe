"use client";

// components/layout/HeaderDropdown.tsx — COQUILLE UNIQUE de menu déroulant du header (Lot 4b).
//
// Une seule implémentation du COMPORTEMENT (ouvert/fermé, survol, clic sur le chevron, Échap,
// clic extérieur, pont anti zone-morte, panneau positionné), réutilisée par « Notre collection »
// ET « La marque ». Le CONTENU du panneau est passé en `children` (CategoryNav, ou une liste de
// liens). But : consolider, ne pas dupliquer la logique — sinon on reproduit le problème résolu
// avec CategoryNav.
//
// Le libellé lui-même est un lien (href) ; le chevron déplie. Le panneau se ferme au clic sur un
// de ses liens (bubbling) et à la navigation (changement de pathname).

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, usePathname } from "@/i18n/navigation";

type Props = {
  label:    string;
  href:     string;                 // destination du libellé (ex. /produits, /qui-sommes-nous)
  active:   boolean;                // état actif → soulignement ambre
  menuId:   string;                 // id unique du panneau (aria-controls)
  colors:   { text: string; amber: string; dropBg: string; dropBdr: string };
  children: ReactNode;              // contenu du panneau
  panelMinWidth?: number;
};

export default function HeaderDropdown({ label, href, active, menuId, colors, children, panelMinWidth = 200 }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  // Ferme à la navigation (le libellé ou un lien du panneau a mené ailleurs).
  useEffect(() => { setOpen(false); }, [pathname]);

  // Ferme au clic hors zone et à Échap (a11y) — écouteurs actifs seulement quand ouvert.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey  = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      {/* Libellé + chevron = UNE entrée → UN SEUL soulignement/survol porté par ce conteneur. */}
      <div className="hdr-collection" style={{ display: "inline-flex", alignItems: "center", borderRadius: 10,
        opacity: active ? 1 : 0.85, transition: "all 0.15s",
        borderBottom: active ? `2px solid ${colors.amber}` : "2px solid transparent" }}>
        <Link href={href} onFocus={() => setOpen(true)}
          style={{ color: colors.text, textDecoration: "none", fontWeight: 700, fontSize: 15, padding: "8px 4px 8px 16px", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center" }}>
          {label}
        </Link>
        <button type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} aria-label={label}
          onClick={() => setOpen(v => !v)}
          style={{ background: "none", border: "none", cursor: "pointer", color: colors.text, padding: "8px 12px 8px 4px", display: "inline-flex", alignItems: "center" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden
            style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
            <path d="M6 9l6 6 6-6" stroke={colors.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
      {open && (
        <>
          {/* Pont invisible déclencheur↔panneau (anti zone-morte au survol). */}
          <div aria-hidden style={{ position: "absolute", top: "100%", left: 0, right: 0, height: 8 }} />
          {/* Le conteneur (offsetParent) démarre au bord de la BOÎTE du déclencheur, soit ~16px à gauche
              du texte (le lien a padding-left:16). On décale donc le panneau de 14px vers la droite pour
              que son bord GAUCHE tombe sous la PREMIÈRE LETTRE du libellé (mesuré au navigateur, Lot 4c). */}
          <div id={menuId} role="menu" onClick={() => setOpen(false)}
            style={{ position: "absolute", top: "calc(100% + 8px)", left: 14, minWidth: panelMinWidth,
              background: colors.dropBg, border: colors.dropBdr, borderRadius: 10,
              boxShadow: "0 14px 34px rgba(0,0,0,0.30)", padding: 5, zIndex: 10000 }}>
            {children}
          </div>
        </>
      )}
    </div>
  );
}
