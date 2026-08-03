"use client";
// components/admin/analytics/MultiSeriesChart.tsx (Lot Synthèse)
// UN graphique, TOUTES les métriques du site. SVG « maison », AUCUNE dépendance
// (même savoir-faire que ComparisonChart). DOUBLE AXE : volume à gauche (barres),
// événements rares à droite (courbes) — sinon 2 ventes seraient collées à zéro sous
// 263 vues. Légende cliquable (chaque série activable/désactivable), UNE infobulle
// unique au survol listant toutes les séries visibles du point. Couleurs vérifiées
// WCAG ≥ 3:1 sur le fond #161210. Cas limites : série tout à zéro (n'écrase pas son
// axe), période vide (message), heure sans événement (0, pas de rupture de courbe).
import { useState } from "react";
import { C } from "@/components/admin/analytics/tokens";

export type AxisSide = "left" | "right";
export type SeriesDef = {
  key: string;        // clé de la métrique dans chaque point (ex. "views", "revenue")
  label: string;      // libellé légende / infobulle
  axis: AxisSide;     // gauche = volume (barres) ; droite = événements rares (courbes)
  color: string;      // couleur (contraste WCAG vérifié en amont)
  unit?: "€";         // formatage de la valeur (défaut : entier)
};
export type MultiPoint = { k: string; [metric: string]: number | string };

// Plafond d'axe « joli » ≥ 1,10× le max réel (repris de ComparisonChart). maxReal ≤ 0
// (série tout à zéro / axe sans série visible) → 1 : l'échelle ne casse pas, courbe/barre à plat.
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
const fmtAxis = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`);
const fmtVal = (v: number, unit?: "€") => unit === "€"
  ? `${(Math.round(v * 100) / 100).toLocaleString("fr-FR")} €`
  : `${Math.round(v)}`;

export default function MultiSeriesChart({ points, granularity, series, narrow = false }: {
  points: MultiPoint[]; granularity: "hour" | "day" | "week"; series: SeriesDef[]; narrow?: boolean;
}) {
  // Toutes visibles par défaut ; le clic sur la légende bascule une série.
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hi, setHi] = useState<number | null>(null);
  const toggle = (k: string) => setHidden(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const n = points.length;
  const vis = series.filter(s => !hidden.has(s.key));
  const leftVis  = vis.filter(s => s.axis === "left");
  const rightVis = vis.filter(s => s.axis === "right");
  const valOf = (s: SeriesDef, i: number) => Number(points[i]?.[s.key]) || 0;
  const maxAcross = (defs: SeriesDef[]) => defs.reduce((mx, s) => {
    for (let i = 0; i < n; i++) mx = Math.max(mx, valOf(s, i));
    return mx;
  }, 0);

  // Y max calculé sur les séries VISIBLES uniquement → masquer le CA rééchelonne l'axe droit
  // et rend les ventes/paniers lisibles (c'est tout l'intérêt du toggle).
  const leftMax  = niceCeil(maxAcross(leftVis));
  const rightMax = niceCeil(maxAcross(rightVis));

  // Aucune donnée du tout (période vide, ou toutes les séries à zéro).
  const allZero = series.every(s => { for (let i = 0; i < n; i++) if (valOf(s, i) > 0) return false; return true; });
  if (n === 0 || allZero) {
    return <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 48 }}>Aucune donnée sur la période.</div>;
  }

  // ── Géométrie viewBox ──────────────────────────────────────────────────────
  const VBW = 640, VBH = 300, TOP = 14, BOT = 28, PADL = 40, PADR = 44;
  const innerW = VBW - PADL - PADR, innerH = VBH - TOP - BOT;
  const slotW = innerW / n;                       // largeur d'un créneau (bucket)
  const cx = (i: number) => PADL + slotW * (i + 0.5); // centre du créneau : barres ET points de courbe
  const yR = (v: number) => TOP + innerH - (v / rightMax) * innerH;

  // Barres groupées (axe gauche). Largeur de groupe = 70 % du créneau, répartie entre les séries visibles.
  const groupW = slotW * 0.7;
  const barW = leftVis.length > 0 ? groupW / leftVis.length : groupW;

  // Labels X : on n'affiche que ce qui TIENT (répartis, premier + dernier), moins sur mobile.
  const keyAt = (i: number) => points[i]?.k ?? "";
  const xLabel = (i: number): string => {
    const k = keyAt(i); if (!k) return "";
    if (granularity === "hour") return `${k.slice(11, 13)}h`;
    return `${k.slice(8, 10)}/${k.slice(5, 7)}`;
  };
  const fmtKey = (k: string): string => {
    if (!k) return "—";
    if (granularity === "hour") return `${k.slice(8, 10)}/${k.slice(5, 7)} ${k.slice(11, 13)}h`;
    if (granularity === "week") return `sem. ${k.slice(8, 10)}/${k.slice(5, 7)}`;
    return `${k.slice(8, 10)}/${k.slice(5, 7)}`;
  };
  const labelUnitW = granularity === "hour" ? 22 : 30;
  const fit = Math.max(2, Math.floor(innerW / (labelUnitW + 8)));
  const nLabels = Math.min(n, narrow ? Math.max(2, Math.round(fit * 0.55)) : fit);
  const labelIdx = new Set<number>();
  if (nLabels <= 1) labelIdx.add(n - 1);
  else for (let j = 0; j < nLabels; j++) labelIdx.add(Math.round((j * (n - 1)) / (nLabels - 1)));

  // Infobulle : dimensions selon le nombre de séries visibles (une ligne par série).
  const tipRows = vis.length;
  const tipH = 20 + tipRows * 13 + 6;
  const tipW = 168;
  const tipX = hi != null ? Math.min(Math.max(cx(hi) + 8, PADL), VBW - tipW - 4) : 0;

  // Largeur mini en px → défilement horizontal sur mobile plutôt qu'un écrasement illisible.
  const minWidth = Math.max(narrow ? 560 : 680, n * (narrow ? 26 : 20));

  return (
    <div>
      {/* Légende cliquable — chaque série activable/désactivable (sinon 8 séries = illisible). */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        {series.map(s => {
          const off = hidden.has(s.key);
          return (
            <button key={s.key} onClick={() => toggle(s.key)}
              title={off ? "Afficher" : "Masquer"}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 8,
                border: `1px solid ${C.faint}`, background: off ? "transparent" : "rgba(242,237,230,0.04)",
                color: off ? C.muted : C.warm, fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                opacity: off ? 0.5 : 1, textDecoration: off ? "line-through" : "none",
              }}>
              <span style={{ width: 10, height: 10, borderRadius: s.axis === "left" ? 2 : 5, background: s.color, flexShrink: 0 }} />
              {s.label}<span style={{ color: C.muted, fontWeight: 600 }}>{s.axis === "left" ? "▮" : "╱"}</span>
            </button>
          );
        })}
      </div>

      {/* Avertissement double-échelle (le piège) — discret mais toujours présent. */}
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>
        ⚠️ Deux échelles : <span style={{ color: "#94a3b8" }}>axe gauche = volume (barres)</span> ·{" "}
        <span style={{ color: "#fb923c" }}>axe droit = événements &amp; CA (courbes)</span>. Deux courbes qui se croisent à l'écran ne se croisent pas dans les chiffres.
      </div>

      <div style={{ background: "#161210", borderRadius: 12, padding: "10px 6px", overflowX: "auto" }}>
        <svg viewBox={`0 0 ${VBW} ${VBH}`} preserveAspectRatio="xMidYMid meet"
          style={{ width: "100%", minWidth, display: "block", height: "auto" }} onMouseLeave={() => setHi(null)}>
          {/* Grille horizontale (4 lignes) */}
          {[0, 1 / 3, 2 / 3, 1].map(t => (
            <line key={t} x1={PADL} x2={VBW - PADR} y1={TOP + innerH - innerH * t} y2={TOP + innerH - innerH * t} stroke="rgba(242,237,230,0.08)" strokeWidth={1} />
          ))}
          {/* Axe gauche (volume) : 0 / moitié / max */}
          {[0, 0.5, 1].map(t => (
            <text key={"l" + t} x={PADL - 6} y={TOP + innerH - innerH * t + 3} fill="#94a3b8" fontSize={9} textAnchor="end" fontFamily="system-ui">{fmtAxis(leftMax * t)}</text>
          ))}
          {/* Axe droit (événements) : 0 / moitié / max */}
          {[0, 0.5, 1].map(t => (
            <text key={"r" + t} x={VBW - PADR + 6} y={TOP + innerH - innerH * t + 3} fill="#fb923c" fontSize={9} textAnchor="start" fontFamily="system-ui">{fmtAxis(rightMax * t)}</text>
          ))}

          {/* Barres groupées (axe gauche) */}
          {leftVis.map((s, si) => (
            <g key={s.key}>
              {points.map((_, i) => {
                const v = valOf(s, i);
                const h = (v / leftMax) * innerH;
                const x = cx(i) - groupW / 2 + si * barW;
                return <rect key={i} x={x} y={TOP + innerH - h} width={Math.max(0.6, barW - 0.6)} height={Math.max(0, h)} fill={s.color} opacity={0.9} />;
              })}
            </g>
          ))}

          {/* Courbes (axe droit) — points centrés sur le créneau (alignés aux barres), et passant
              PAR les zéros (heure sans événement = 0, jamais de rupture de courbe). Un seul point
              (n===1) → cercle, sinon la courbe serait invisible. */}
          {rightVis.map(s => {
            if (n === 1) return <circle key={s.key} cx={cx(0)} cy={yR(valOf(s, 0))} r={3} fill={s.color} />;
            const d = points.map((_, i) => `${i === 0 ? "M" : "L"} ${cx(i).toFixed(1)} ${yR(valOf(s, i)).toFixed(1)}`).join(" ");
            return <path key={s.key} d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />;
          })}

          {/* Labels X */}
          {points.map((_, i) => (labelIdx.has(i) && xLabel(i)) ? (
            <text key={"x" + i} x={cx(i)} y={VBH - 9} fill={C.muted} fontSize={9} textAnchor="middle" fontFamily="system-ui">{xLabel(i)}</text>
          ) : null)}

          {/* Zones de survol (une par créneau) → une SEULE infobulle */}
          {points.map((_, i) => (
            <rect key={"h" + i} x={cx(i) - slotW / 2} y={TOP} width={slotW} height={innerH} fill="transparent" onMouseEnter={() => setHi(i)} style={{ cursor: "pointer" }} />
          ))}

          {/* Guide + infobulle UNIQUE : toutes les séries visibles du point survolé */}
          {hi != null && (
            <g pointerEvents="none">
              <line x1={cx(hi)} x2={cx(hi)} y1={TOP} y2={TOP + innerH} stroke="rgba(196,154,74,0.35)" strokeWidth={1} />
              <rect x={tipX} y={6} width={tipW} height={tipH} rx={6} fill="#0d0b09" opacity={0.97} stroke="rgba(242,237,230,0.12)" />
              <text x={tipX + 8} y={20} fill={C.warm} fontSize={9.5} fontWeight={800} fontFamily="system-ui">{fmtKey(keyAt(hi))}</text>
              {vis.map((s, r) => (
                <g key={s.key}>
                  <rect x={tipX + 8} y={26 + r * 13 - 6} width={7} height={7} rx={s.axis === "left" ? 1 : 3.5} fill={s.color} />
                  <text x={tipX + 19} y={26 + r * 13} fill="rgba(242,237,230,0.72)" fontSize={9} fontFamily="system-ui">{s.label}</text>
                  <text x={tipX + tipW - 8} y={26 + r * 13} fill={C.warm} fontSize={9} fontWeight={700} textAnchor="end" fontFamily="system-ui">{fmtVal(valOf(s, hi), s.unit)}</text>
                </g>
              ))}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
