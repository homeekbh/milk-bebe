"use client";
// components/admin/analytics/ComparisonChart.tsx (Lot A5)
// Courbe comparative période courante vs période précédente. SVG « maison »,
// AUCUNE dépendance. Ne fetche rien : reçoit points / compare / granularity /
// la métrique et son libellé. Les deux séries sont alignées par INDEX (point i
// courant vs point i comparaison) ; la comparaison, plus longue (période entière),
// dépasse la courbe courante partielle — « on voit où elle a fini ».
import { useState } from "react";
import { C, MONTHS_FR } from "@/components/admin/analytics/tokens";

export type SeriesPoint = { k: string; sessions: number; visitors: number; views: number };
export type MetricKey = "sessions" | "visitors" | "views";

export type ComparisonChartProps = {
  points:       SeriesPoint[];
  compare:      SeriesPoint[];
  granularity:  "hour" | "day" | "month";
  metric:       MetricKey;
  label:        string;   // libellé de la métrique (ex. « Sessions »)
  compareLabel: string;   // libellé de la comparaison (ex. « vs semaine dernière »)
};

// Palier supérieur « joli » pour l'axe Y (1 / 2 / 5 × 10ⁿ).
function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}
const fmt = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`);

export default function ComparisonChart({ points, compare, granularity, metric, label, compareLabel }: ComparisonChartProps) {
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
  const xLabel = (i: number): string => {
    const k = keyAt(i);
    if (!k) return "";
    if (granularity === "hour")  { const hh = k.slice(11, 13); return ["00", "06", "12", "18"].includes(hh) ? hh : ""; }
    if (granularity === "month") { const mi = Number(k.slice(5, 7)) - 1; return `${MONTHS_FR[mi] ?? k}.`; }
    return `${k.slice(8, 10)}/${k.slice(5, 7)}`;
  };
  const showLabel = (i: number): boolean => {
    if (granularity === "hour")  return xLabel(i) !== "";
    if (granularity === "month") return true;
    return maxLen > 15 ? (i % 5 === 0 || i === maxLen - 1) : true; // jour : tous les 5 si > 15 points
  };

  // Infobulle
  const hv = hi != null ? hi : null;
  const cv  = hv != null && hv < cur.length ? cur[hv] : null;
  const cvp = hv != null && hv < cmp.length ? cmp[hv] : null;
  const delta = cv != null && cvp != null && cvp > 0 ? ((cv - cvp) / cvp) * 100 : null;
  const gid = `cmpgrad-${metric}`;

  return (
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

        {/* Guide + infobulle */}
        {hv != null && (
          <g pointerEvents="none">
            <line x1={x(hv)} x2={x(hv)} y1={TOP} y2={TOP + innerH} stroke="rgba(196,154,74,0.35)" strokeWidth={1} />
            <rect x={Math.min(Math.max(x(hv), 70), VBW - 70) - 66} y={4} width={132} height={44} rx={6} fill="#0d0b09" opacity={0.96} />
            <text x={Math.min(Math.max(x(hv), 70), VBW - 70)} y={17} fill="#c49a4a" fontSize={10} fontWeight={800} textAnchor="middle" fontFamily="system-ui">{label} : {cv ?? "—"}</text>
            <text x={Math.min(Math.max(x(hv), 70), VBW - 70)} y={29} fill="rgba(242,237,230,0.7)" fontSize={9} textAnchor="middle" fontFamily="system-ui">{compareLabel} : {cvp ?? "—"}</text>
            <text x={Math.min(Math.max(x(hv), 70), VBW - 70)} y={42} fill={delta == null ? C.muted : delta >= 0 ? "#22c55e" : "#ef4444"} fontSize={10} fontWeight={800} textAnchor="middle" fontFamily="system-ui">
              {delta == null ? "n/a" : `${delta >= 0 ? "▲ +" : "▼ "}${delta.toFixed(1)}%`}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
