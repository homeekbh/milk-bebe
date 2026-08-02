"use client";
// components/admin/analytics/ComparisonChart.tsx (Lot A5)
// Courbe comparative période courante vs période précédente. SVG « maison »,
// AUCUNE dépendance. Ne fetche rien : reçoit points / compare / granularity /
// la métrique et son libellé. Les deux séries sont alignées par INDEX (point i
// courant vs point i comparaison) ; la comparaison, plus longue (période entière),
// dépasse la courbe courante partielle — « on voit où elle a fini ».
import { useState } from "react";
import { C } from "@/components/admin/analytics/tokens";

export type SeriesPoint = { k: string; [metric: string]: number | string };
export type MetricKey = string; // généralisé (A8) : sessions, revenue, add_to_cart… — rendu inchangé

export type ComparisonChartProps = {
  points:       SeriesPoint[];
  compare:      SeriesPoint[];
  granularity:  "hour" | "day" | "week";
  metric:       MetricKey;
  label:        string;   // libellé de la métrique (ex. « Sessions »)
  currentLabel: string;   // libellé de la période courante (ex. « aujourd'hui »)
  compareLabel: string;   // libellé de la comparaison (ex. « vs semaine dernière »)
  narrow?:      boolean;  // écran étroit (mobile) → moins de libellés d'axe
};

// Plafond de l'axe Y (A7.C1 · paliers A8.4) : plus petit palier LISIBLE ≥ 1,10× le
// max réel des deux séries. Paliers = {1, 2, 2.5, 3, 4, 5} × 10ⁿ. Colle au pic :
// 22 → 25 · 340 → 400 (au lieu de 500, hors cible avant l'ajout de 3 et 4).
function niceCeil(maxReal: number): number {
  if (maxReal <= 0) return 1;
  const target = maxReal * 1.10;
  const mant = [1, 2, 2.5, 3, 4, 5];
  const base = Math.floor(Math.log10(target));
  for (let e = base - 1; e <= base + 3; e++) {
    for (const m of mant) {
      const c = m * Math.pow(10, e);
      if (c >= target) return Math.round(c * 100) / 100;
    }
  }
  return Math.pow(10, base + 1);
}
const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const fmt = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`);

export default function ComparisonChart({ points, compare, granularity, metric, label, currentLabel, compareLabel, narrow = false }: ComparisonChartProps) {
  const [hi, setHi] = useState<number | null>(null);

  const cur = points.map(p => Number(p[metric]) || 0);
  const cmp = compare.map(p => Number(p[metric]) || 0);
  const maxLen = Math.max(cur.length, cmp.length);

  if (maxLen === 0 || [...cur, ...cmp].every(v => v === 0)) {
    return <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 40 }}>Aucune donnée sur la période.</div>;
  }

  const VBW = 600, VBH = 220, TOP = 16, BOT = 26, PADL = 38, PADR = 12;
  const innerW = VBW - PADL - PADR, innerH = VBH - TOP - BOT;
  const maxY = niceCeil(Math.max(...cur, ...cmp, 0));
  const x = (i: number) => (maxLen <= 1 ? PADL + innerW / 2 : PADL + (i / (maxLen - 1)) * innerW);
  const y = (v: number) => TOP + innerH - (v / maxY) * innerH;

  const pathOf = (arr: number[]) => arr.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const curLine = pathOf(cur);
  const cmpLine = pathOf(cmp);
  const area = cur.length ? `${curLine} L ${x(cur.length - 1).toFixed(1)} ${(TOP + innerH).toFixed(1)} L ${x(0).toFixed(1)} ${(TOP + innerH).toFixed(1)} Z` : "";

  const keyAt = (i: number) => points[i]?.k ?? compare[i]?.k ?? "";
  // Libellé d'axe court selon le pas : heure → « 14h » ; jour/semaine → « 12/07 »
  // (semaine = date du lundi ; le pas hebdomadaire se lit à l'espacement + l'infobulle).
  const xLabel = (i: number): string => {
    const k = keyAt(i);
    if (!k) return "";
    if (granularity === "hour") return `${k.slice(11, 13)}h`;
    return `${k.slice(8, 10)}/${k.slice(5, 7)}`;
  };
  // Date complète d'un point pour l'infobulle (avec l'heure / le « sem. » selon le pas).
  const fmtKey = (k: string): string => {
    if (!k) return "—";
    if (granularity === "hour") return `${k.slice(8, 10)}/${k.slice(5, 7)} ${k.slice(11, 13)}h`;
    if (granularity === "week") return `sem. ${k.slice(8, 10)}/${k.slice(5, 7)}`;
    return `${k.slice(8, 10)}/${k.slice(5, 7)}`;
  };
  // Anti-chevauchement : on n'affiche QUE le nombre de libellés qui TIENT dans la largeur
  // (viewBox 600), aux indices RÉPARTIS uniformément (premier + dernier inclus). Mobile
  // (narrow) → encore moins. Jamais deux libellés collés, quel que soit le nb de points.
  const labelUnitW = granularity === "hour" ? 20 : 30; // largeur approx d'un libellé (unités viewBox)
  const fitLabels  = Math.max(2, Math.floor(innerW / (labelUnitW + 8)));
  const maxLabels  = narrow ? Math.max(2, Math.round(fitLabels * 0.55)) : fitLabels;
  const nLabels    = Math.min(maxLen, maxLabels);
  const labelIdx   = new Set<number>();
  if (nLabels <= 1) labelIdx.add(maxLen - 1);
  else for (let j = 0; j < nLabels; j++) labelIdx.add(Math.round((j * (maxLen - 1)) / (nLabels - 1)));
  const showLabel = (i: number): boolean => labelIdx.has(i);

  // Infobulle
  const hv = hi != null ? hi : null;
  const cv  = hv != null && hv < cur.length ? cur[hv] : null;
  const cvp = hv != null && hv < cmp.length ? cmp[hv] : null;
  const delta = cv != null && cvp != null && cvp > 0 ? ((cv - cvp) / cvp) * 100 : null;
  const hoverCx = hv != null ? Math.min(Math.max(x(hv), 82), VBW - 82) : 0; // centre clampé (boîte 156)
  const curKey  = hv != null ? (points[hv]?.k ?? "")  : "";
  const cmpKey  = hv != null ? (compare[hv]?.k ?? "") : "";
  const gid = `cmpgrad-${metric}`;

  return (
    <div>
      {/* Légende (A7.C2) — libellés issus des mêmes fonctions que la barre de contrôle. */}
      <div style={{ display: "flex", gap: 16, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: C.muted }}>
          <svg width={20} height={8}><line x1={0} y1={4} x2={20} y2={4} stroke="#c49a4a" strokeWidth={2} strokeLinecap="round" /></svg>{cap(currentLabel)}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: C.muted }}>
          <svg width={20} height={8}><line x1={0} y1={4} x2={20} y2={4} stroke="rgba(242,237,230,0.35)" strokeWidth={2} strokeDasharray="4 2" strokeLinecap="round" /></svg>{cap(compareLabel.replace(/^vs\s*/i, ""))}
        </span>
      </div>
      <div style={{ background: "#161210", borderRadius: 12, padding: "10px 8px", overflowX: "auto" }}>
      <svg viewBox={`0 0 ${VBW} ${VBH}`} preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", minWidth: 320, display: "block" }} onMouseLeave={() => setHi(null)}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#c49a4a" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#c49a4a" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Grille : 4 lignes horizontales (C.warm 8%) */}
        {[0, 1 / 3, 2 / 3, 1].map(t => (
          <line key={t} x1={PADL} x2={VBW - PADR} y1={TOP + innerH - innerH * t} y2={TOP + innerH - innerH * t} stroke="rgba(242,237,230,0.08)" strokeWidth={1} />
        ))}
        {/* Axe Y : 3 valeurs (0, moitié, max) */}
        {[0, 0.5, 1].map(t => (
          <text key={t} x={PADL - 6} y={TOP + innerH - innerH * t + 3} fill={C.muted} fontSize={9} textAnchor="end" fontFamily="system-ui">{fmt(maxY * t)}</text>
        ))}

        {/* Comparaison : ligne C.warm 35%, pointillés, sans aire */}
        <path d={cmpLine} fill="none" stroke="rgba(242,237,230,0.35)" strokeWidth={2} strokeDasharray="4 2" strokeLinejoin="round" strokeLinecap="round" />
        {/* Courante : aire dégradée + ligne ambre pleine */}
        <path d={area} fill={`url(#${gid})`} stroke="none" />
        <path d={curLine} fill="none" stroke="#c49a4a" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* Labels X + zones de survol */}
        {Array.from({ length: maxLen }, (_, i) => (
          <g key={i}>
            <rect x={x(i) - Math.max(5, innerW / maxLen / 2)} y={TOP} width={Math.max(10, innerW / maxLen)} height={innerH}
                  fill="transparent" onMouseEnter={() => setHi(i)} style={{ cursor: "pointer" }} />
            {showLabel(i) && xLabel(i) && (
              <text x={x(i)} y={VBH - 8} fill={C.muted} fontSize={9} textAnchor="middle" fontFamily="system-ui">{xLabel(i)}</text>
            )}
          </g>
        ))}

        {/* Points survolés */}
        {hv != null && cv != null && <circle cx={x(hv)} cy={y(cv)} r={3.5} fill="#c49a4a" stroke="#161210" strokeWidth={1.5} />}
        {hv != null && cvp != null && <circle cx={x(hv)} cy={y(cvp)} r={3} fill="rgba(242,237,230,0.6)" />}

        {/* Guide + infobulle : métrique, valeur COURANTE + sa date, valeur COMPARÉE +
            sa date, écart %. Chaque série porte donc sa date respective (ambre = en cours,
            gris = période précédente). */}
        {hv != null && (
          <g pointerEvents="none">
            <line x1={x(hv)} x2={x(hv)} y1={TOP} y2={TOP + innerH} stroke="rgba(196,154,74,0.35)" strokeWidth={1} />
            <rect x={hoverCx - 78} y={2} width={156} height={58} rx={6} fill="#0d0b09" opacity={0.96} />
            <text x={hoverCx} y={15} fill={C.muted} fontSize={9} fontWeight={700} textAnchor="middle" fontFamily="system-ui">{label}</text>
            <text x={hoverCx} y={28} fill="#c49a4a" fontSize={10.5} fontWeight={800} textAnchor="middle" fontFamily="system-ui">{fmtKey(curKey)} — {cv ?? "—"}</text>
            <text x={hoverCx} y={40} fill="rgba(242,237,230,0.72)" fontSize={9.5} textAnchor="middle" fontFamily="system-ui">{fmtKey(cmpKey)} — {cvp ?? "—"}</text>
            <text x={hoverCx} y={53} fill={delta == null ? C.muted : delta >= 0 ? "#22c55e" : "#ef4444"} fontSize={10} fontWeight={800} textAnchor="middle" fontFamily="system-ui">
              {delta == null ? "n/a" : `${delta >= 0 ? "▲ +" : "▼ "}${delta.toFixed(1)}%`}
            </text>
          </g>
        )}
      </svg>
      </div>
    </div>
  );
}
