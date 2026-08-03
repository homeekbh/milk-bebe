"use client";
// components/admin/analytics/AnalyticsTabs.tsx (Lot A4 · menu mobile A8.1)
// Desktop : onglets en ligne. Mobile (useIsNarrow) : MENU DÉROULANT (bouton = onglet
// actif + chevron ; liste au clic ; actif marqué ; fermeture clic-extérieur + Échap).
// Réutilise le pattern popover click-outside déjà présent (AdminClocks / SearchGlobal).
// Chaque lien PRÉSERVE la query string courante (période, mode, bots).
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useIsNarrow } from "@/lib/useIsNarrow";
import { C } from "@/components/admin/analytics/tokens";

const TABS: { href: string; label: string }[] = [
  { href: "/admin/analytics",              label: "Vue d'ensemble" },
  { href: "/admin/analytics/trafic",       label: "Trafic" },
  { href: "/admin/analytics/comportement", label: "Comportement" },
  { href: "/admin/analytics/ventes",       label: "Ventes" },
  { href: "/admin/analytics/clients",      label: "Clients & fidélité" },
  { href: "/admin/analytics/operationnel", label: "Opérationnel" },
  { href: "/admin/analytics/synthese",     label: "Synthèse" },
];

export default function AnalyticsTabs() {
  // Seuil relevé à 1350px : 7 onglets (ajout « Synthèse ») + libellés longs
  // (« CLIENTS & FIDÉLITÉ »…) + sidebar admin (~220–300px) débordent la barre en
  // ligne en dessous d'environ 1310px. Sous 1350 → menu déroulant (7 onglets
  // atteignables) ; au-delà → onglets en ligne. Le seuil précédent (1100, pour 6
  // onglets) laissait le 7e hors-champ dans la zone 1100–1310px.
  const narrow = useIsNarrow(1350);
  const pathname = usePathname();
  const sp = useSearchParams();
  const qs = sp.toString();
  const hrefOf = (h: string) => qs ? `${h}?${qs}` : h;
  const active = TABS.find(t => t.href === pathname) ?? TABS[0];

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  if (narrow) {
    return (
      <div ref={ref} style={{ position: "relative", marginBottom: 12 }}>
        <button onClick={() => setOpen(v => !v)}
          style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "#161210", border: `1px solid ${C.faint}`, color: C.warm, fontSize: 12, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", cursor: "pointer" }}>
          <span>{active.label}</span>
          <span style={{ color: C.amber, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s", fontSize: 11 }}>▾</span>
        </button>
        {open && (
          <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 40, background: "#161210", border: `1px solid ${C.faint}`, borderRadius: 10, boxShadow: "0 16px 40px rgba(0,0,0,0.5)", overflow: "hidden" }}>
            {TABS.map(t => {
              const on = t.href === active.href;
              return (
                <Link key={t.href} href={hrefOf(t.href)} prefetch={false} onClick={() => setOpen(false)}
                  style={{ display: "block", padding: "11px 14px", textDecoration: "none", fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: on ? "#c49a4a" : "rgba(242,237,230,0.7)", background: on ? "rgba(196,154,74,0.12)" : "transparent" }}>
                  {on ? "✓ " : ""}{t.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <nav style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", borderBottom: `1px solid ${C.faint}` }}>
      {TABS.map(t => {
        const on = pathname === t.href;
        return (
          <Link key={t.href} href={hrefOf(t.href)} prefetch={false}
            style={{ flexShrink: 0, textDecoration: "none", whiteSpace: "nowrap", padding: "10px 14px", fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: on ? C.warm : "rgba(242,237,230,0.55)", borderBottom: on ? "2px solid #c49a4a" : "2px solid transparent", background: "transparent", marginBottom: -1 }}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
