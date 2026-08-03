"use client";
// components/admin/analytics/widgets.tsx
// Petits composants d'affichage partagés du dashboard analytics, extraits À
// L'IDENTIQUE de page.tsx (Lot A4) pour être réutilisés par les sous-routes.
import { C } from "@/components/admin/analytics/tokens";

export function Skeleton({ h = 80 }: { h?: number }) {
  return <div style={{ height: h, borderRadius: 12, background: "rgba(242,237,230,0.04)", border: `1px solid ${C.faint}`, display: "grid", placeItems: "center", color: C.muted, fontSize: 12 }}>Chargement…</div>;
}

// Badge d'écart signé, coloré selon le SENS FAVORABLE de la métrique (pas selon le
// signe brut) : une baisse du taux de rebond est une bonne nouvelle → verte.
// Accepte le delta discriminé (number | "new" | null) : « nouveau » depuis zéro, « — » si rien
// à comparer — jamais « 0,0 % » (défaut #4).
export function DeltaBadge({ d, better, lowVol }: { d: number | "new" | null; better: "up" | "down"; lowVol?: boolean }) {
  if (d === "new") return <span style={{ color: "#22c55e", fontWeight: 800, fontSize: 12 }}>nouveau</span>;
  if (d == null)   return <span style={{ color: "rgba(242,237,230,0.45)", fontSize: 12 }}>—</span>;
  const favorable = better === "up" ? d >= 0 : d <= 0;
  const col = lowVol ? "rgba(242,237,230,0.45)" : (favorable ? "#22c55e" : "#ef4444");
  return <span style={{ color: col, fontWeight: 800, fontSize: 13, whiteSpace: "nowrap" }}>{d >= 0 ? "▲ +" : "▼ "}{d.toFixed(1)}%</span>;
}

// Placeholder quand aucune donnée de comportement (PATCH) n'est encore arrivée.
export function BehaviorPlaceholder() {
  return (
    <div style={{ textAlign: "center", padding: "32px", color: C.muted, fontSize: 13 }}>
      📊 Les données de comportement apparaîtront<br />après les premières visites complètes
    </div>
  );
}
