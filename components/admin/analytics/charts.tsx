"use client";
// components/admin/analytics/charts.tsx
// Les 9 graphes SVG « maison » du dashboard analytics (aucune lib externe),
// extraits À L'IDENTIQUE de app/admin/analytics/page.tsx — aucun changement
// visuel ni de calcul (refactoring pur, cf. Lot A2).
import { useState, useMemo } from "react";
import { C, CHANNEL_COLORS, CHANNEL_LABELS_FR, WEEKDAYS, MONTHS_FR } from "./tokens";

export type BarChartProps = { data: { label: string; value: number }[]; height?: number; unit?: string };
export function BarChart({ data, height = 160, unit = "" }: BarChartProps) {
  const [hi, setHi] = useState<number | null>(null);
  if (!data.length) return <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 30 }}>Aucune donnée</div>;
  const max = Math.max(...data.map(d => d.value), 1);
  const TOP = 16; // marge haute pour afficher les valeurs au-dessus des barres
  const fmt = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`);
  const showValues = data.length <= 16; // au-delà, valeurs seulement au survol (lisibilité)
  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 600 ${height + TOP + 26}`} style={{ width: "100%", minWidth: 280 }}>
        {[0.25, 0.5, 0.75, 1].map(t => (
          <line key={t} x1={20} x2={590} y1={TOP + height - height * t} y2={TOP + height - height * t} stroke={C.faint} strokeWidth={1} />
        ))}
        {data.map((d, i) => {
          const w = Math.max(4, (560 / data.length) - 4);
          const gap = (560 - w * data.length) / (data.length + 1);
          const x = 20 + gap + i * (w + gap);
          const h = (d.value / max) * height;
          const active = hi === i;
          return (
            <g key={i} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)}>
              <rect x={x} y={TOP + height - h} width={w} height={h} rx={3} fill={C.amber} opacity={active ? 1 : 0.82} />
              {(showValues || active) && d.value > 0 && (
                <text x={x + w / 2} y={TOP + height - h - 4} fill={active ? C.warm : C.muted} fontSize={active ? 11 : 9} fontWeight={active ? 800 : 600} textAnchor="middle" fontFamily="system-ui">{fmt(d.value)}{unit}</text>
              )}
              {(data.length <= 14 || i % Math.ceil(data.length / 14) === 0) && (
                <text x={x + w / 2} y={TOP + height + 18} fill={C.muted} fontSize={9} textAnchor="middle" fontFamily="system-ui">{d.label}</text>
              )}
              <title>{d.label}: {d.value}{unit}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export type MiniBarProps = { value: number; max: number; color?: string };
export function MiniBar({ value, max, color = C.amber }: MiniBarProps) {
  return (
    <div style={{ height: 4, background: C.faint, borderRadius: 99, marginTop: 6 }}>
      <div style={{ height: "100%", width: `${Math.min(100, (value / Math.max(max, 1)) * 100)}%`, background: color, borderRadius: 99, transition: "width 0.5s ease" }} />
    </div>
  );
}

export type DonutChartProps = { data: { label: string; value: number; color: string }[] };
export function DonutChart({ data }: DonutChartProps) {
  const [hi, setHi] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <div style={{ color: C.muted, fontSize: 13, padding: "16px 0" }}>Aucune donnée</div>;
  const r = 55; const cx = 75; const cy = 75; let offset = -Math.PI / 2;
  const slices = data.map(d => {
    const angle = (d.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(offset), y1 = cy + r * Math.sin(offset);
    const x2 = cx + r * Math.cos(offset + angle), y2 = cy + r * Math.sin(offset + angle);
    const s = { ...d, path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${angle > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z` };
    offset += angle; return s;
  });
  const centerVal = hi != null ? String(slices[hi].value) : String(total);
  const centerSub = hi != null ? slices[hi].label : "total";
  return (
    <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
      <svg viewBox="0 0 150 150" style={{ width: 116, flexShrink: 0 }}>
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} opacity={hi == null || hi === i ? 0.9 : 0.32}
            onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)} style={{ cursor: "pointer", transition: "opacity 0.12s" }}>
            <title>{s.label}: {s.value} ({((s.value / total) * 100).toFixed(0)}%)</title>
          </path>
        ))}
        <circle cx={cx} cy={cy} r={34} fill={C.card} />
        <text x={cx} y={cy - 1} fill={C.warm} fontSize={13} textAnchor="middle" fontFamily="system-ui" fontWeight="bold">{centerVal}</text>
        <text x={cx} y={cy + 12} fill={C.muted} fontSize={7} textAnchor="middle" fontFamily="system-ui">{centerSub}</text>
      </svg>
      <div style={{ display: "grid", gap: 7, flex: 1 }}>
        {slices.map((s, i) => (
          <div key={i} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)}
            style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", opacity: hi == null || hi === i ? 1 : 0.5, transition: "opacity 0.12s" }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: C.muted, flex: 1 }}>{s.label}</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: C.warm }}>{s.value} · {((s.value / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Barres horizontales pour une distribution (scroll / durée).
export type HBarsProps = { data: { label: string; value: number }[]; color?: string };
export function HBars({ data, color = C.amber }: HBarsProps) {
  const max   = Math.max(...data.map(d => d.value), 1);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div style={{ color: C.muted, fontSize: 12 }}>Données disponibles après les premières visites trackées.</div>;
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {data.map(d => (
        <div key={d.label}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted }}>
            <span>{d.label}</span><span style={{ color: C.warm, fontWeight: 700 }}>{d.value}</span>
          </div>
          <MiniBar value={d.value} max={max} color={color} />
        </div>
      ))}
    </div>
  );
}

// ─── Nouveaux vs récurrents dans le temps (2 séries, SVG maison) + jour/mois ──────
export type NewVsReturningChartProps = { byDay: { date: string; new: number; returning: number }[] };
export function NewVsReturningChart({ byDay }: NewVsReturningChartProps) {
  const [gran, setGran] = useState<"day" | "month">("day");
  const [hi, setHi]     = useState<number | null>(null);

  const data = useMemo(() => {
    const src = Array.isArray(byDay) ? byDay : [];
    if (gran === "month") {
      const m = new Map<string, { n: number; r: number }>();
      for (const d of src) {
        const key = String(d.date).slice(0, 7);
        const e = m.get(key) ?? { n: 0, r: 0 };
        e.n += Number(d.new) || 0; e.r += Number(d.returning) || 0;
        m.set(key, e);
      }
      return [...m.entries()].map(([ym, e]) => {
        const [yy, mm] = ym.split("-");
        return { key: ym, label: `${MONTHS_FR[Number(mm) - 1] ?? mm} ${yy.slice(2)}`, nw: e.n, rt: e.r };
      });
    }
    return src.map(d => ({ key: String(d.date), label: String(d.date).slice(5), nw: Number(d.new) || 0, rt: Number(d.returning) || 0 }));
  }, [byDay, gran]);

  const VBW = 600, VBH = 200, TOP = 16, BOT = 28, PADX = 10;
  const innerW = VBW - PADX * 2, innerH = VBH - TOP - BOT;
  const max = Math.max(...data.map(d => Math.max(d.nw, d.rt)), 1);
  const n = data.length;
  const px = (i: number) => (n <= 1 ? PADX + innerW / 2 : PADX + (i / (n - 1)) * innerW);
  const py = (v: number) => TOP + innerH - (v / max) * innerH;
  const lineOf = (sel: (d: { nw: number; rt: number }) => number) => data.map((d, i) => `${i === 0 ? "M" : "L"} ${px(i).toFixed(1)} ${py(sel(d)).toFixed(1)}`).join(" ");
  const labelEvery = Math.max(1, Math.ceil(n / 12));
  const hv = hi != null ? data[hi] : null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 14, fontSize: 12 }}>
          <span style={{ color: C.muted }}><span style={{ display: "inline-block", width: 12, height: 3, background: C.amber, borderRadius: 2, marginRight: 5, verticalAlign: "middle" }} />Nouveaux</span>
          <span style={{ color: C.muted }}><span style={{ display: "inline-block", width: 12, height: 3, background: C.green, borderRadius: 2, marginRight: 5, verticalAlign: "middle" }} />Récurrents</span>
        </div>
        <div style={{ display: "flex", gap: 4, background: "#0d0b09", borderRadius: 9, padding: 3, border: `1px solid ${C.faint}` }}>
          {(["day", "month"] as const).map(g => (
            <button key={g} onClick={() => { setGran(g); setHi(null); }}
              style={{ padding: "5px 12px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 800, background: gran === g ? C.amber : "transparent", color: gran === g ? "#1a1410" : C.muted }}>
              {g === "day" ? "Jour" : "Mois"}
            </button>
          ))}
        </div>
      </div>

      {n === 0 ? (
        <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 30 }}>Aucune donnée</div>
      ) : (
        <div style={{ background: "#161210", borderRadius: 12, padding: "10px 8px", overflowX: "auto" }}>
          <svg viewBox={`0 0 ${VBW} ${VBH}`} style={{ width: "100%", minWidth: 320, display: "block" }} onMouseLeave={() => setHi(null)}>
            {[0, 0.25, 0.5, 0.75, 1].map(t => (
              <line key={t} x1={PADX} x2={VBW - PADX} y1={TOP + innerH - innerH * t} y2={TOP + innerH - innerH * t} stroke={C.faint} strokeWidth={1} />
            ))}
            <path d={lineOf(d => d.rt)} fill="none" stroke={C.green} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            <path d={lineOf(d => d.nw)} fill="none" stroke={C.amber} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {data.map((d, i) => (
              <g key={d.key}>
                <rect x={px(i) - Math.max(6, innerW / n / 2)} y={TOP} width={Math.max(12, innerW / n)} height={innerH} fill="transparent" onMouseEnter={() => setHi(i)} style={{ cursor: "pointer" }} />
                <circle cx={px(i)} cy={py(d.rt)} r={hi === i ? 4 : 2.4} fill={C.green} />
                <circle cx={px(i)} cy={py(d.nw)} r={hi === i ? 4 : 2.4} fill={C.amber} />
                {(i % labelEvery === 0 || i === n - 1) && (
                  <text x={px(i)} y={VBH - 8} fill={C.muted} fontSize={9} textAnchor="middle" fontFamily="system-ui">{d.label}</text>
                )}
                <title>{d.label} — Nouveaux {d.nw} · Récurrents {d.rt}</title>
              </g>
            ))}
            {hv && (
              <g pointerEvents="none">
                <line x1={px(hi!)} x2={px(hi!)} y1={TOP} y2={TOP + innerH} stroke="rgba(196,154,74,0.35)" strokeWidth={1} />
                <rect x={Math.min(Math.max(px(hi!), 62), VBW - 62) - 60} y={4} width={120} height={34} rx={5} fill="#0d0b09" opacity={0.95} />
                <text x={Math.min(Math.max(px(hi!), 62), VBW - 62)} y={16} fill={C.warm} fontSize={10} fontWeight={800} textAnchor="middle" fontFamily="system-ui">{hv.label}</text>
                <text x={Math.min(Math.max(px(hi!), 62), VBW - 62)} y={30} fill={C.muted} fontSize={9} textAnchor="middle" fontFamily="system-ui">Nouv. {hv.nw} · Réc. {hv.rt}</text>
              </g>
            )}
          </svg>
        </div>
      )}
    </div>
  );
}

// ─── Tunnel de conversion (SVG maison) — barres décroissantes + % passage/perte ──
export type FunnelChartProps = { steps: { key: string; label: string; count: number; estimated?: boolean }[] };
export function FunnelChart({ steps }: FunnelChartProps) {
  const top = steps[0]?.count || 0;
  const max = Math.max(...steps.map(s => s.count), 1);
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {steps.map((s, i) => {
        const wPct    = Math.max(2, (s.count / max) * 100);
        const passTop = top > 0 ? (s.count / top) * 100 : 0;
        const prev    = i > 0 ? steps[i - 1].count : null;
        const loss    = prev != null && prev > 0 ? ((prev - s.count) / prev) * 100 : null;
        return (
          <div key={s.key}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4, gap: 8, flexWrap: "wrap" }}>
              <span style={{ color: C.warm, fontWeight: 700 }}>
                {i + 1}. {s.label}{s.estimated ? <span style={{ color: C.muted, fontWeight: 500 }}> · estimé</span> : null}
              </span>
              <span style={{ color: C.muted }}>
                <span style={{ color: C.amber, fontWeight: 800 }}>{s.count}</span> · {passTop.toFixed(1)}% des sessions
              </span>
            </div>
            <div style={{ height: 26, background: C.faint, borderRadius: 8, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${wPct}%`, background: `linear-gradient(90deg, ${C.amber}, rgba(196,154,74,0.55))`, borderRadius: 8, transition: "width 0.5s ease" }} />
            </div>
            {loss != null && loss > 0 && (
              <div style={{ fontSize: 11, color: C.red, marginTop: 3, fontWeight: 700 }}>↓ −{loss.toFixed(1)}% de déperdition vs étape précédente</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Courbe générique (1 série, SVG maison) — pour les évolutions temporelles ───
export type LineChartProps = { data: { label: string; value: number }[]; color?: string; unit?: string; height?: number };
export function LineChart({ data, color = C.amber, unit = "", height = 200 }: LineChartProps) {
  const [hi, setHi] = useState<number | null>(null);
  const n = data.length;
  if (n === 0) return <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 30 }}>Aucune donnée</div>;
  const VBW = 600, VBH = height, TOP = 16, BOT = 28, PADX = 10;
  const innerW = VBW - PADX * 2, innerH = VBH - TOP - BOT;
  const max = Math.max(...data.map(d => d.value), 1);
  const px = (i: number) => (n <= 1 ? PADX + innerW / 2 : PADX + (i / (n - 1)) * innerW);
  const py = (v: number) => TOP + innerH - (v / max) * innerH;
  const line = data.map((d, i) => `${i === 0 ? "M" : "L"} ${px(i).toFixed(1)} ${py(d.value).toFixed(1)}`).join(" ");
  const area = `${line} L ${px(n - 1).toFixed(1)} ${(TOP + innerH).toFixed(1)} L ${px(0).toFixed(1)} ${(TOP + innerH).toFixed(1)} Z`;
  const labelEvery = Math.max(1, Math.ceil(n / 12));
  const hv = hi != null ? data[hi] : null;
  const fmt = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`);
  return (
    <div style={{ background: "#161210", borderRadius: 12, padding: "10px 8px", overflowX: "auto" }}>
      <svg viewBox={`0 0 ${VBW} ${VBH}`} style={{ width: "100%", minWidth: 320, display: "block" }} onMouseLeave={() => setHi(null)}>
        {[0, 0.25, 0.5, 0.75, 1].map(t => (
          <line key={t} x1={PADX} x2={VBW - PADX} y1={TOP + innerH - innerH * t} y2={TOP + innerH - innerH * t} stroke={C.faint} strokeWidth={1} />
        ))}
        <path d={area} fill={color} fillOpacity={0.12} stroke="none" />
        <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => {
          const active = hi === i;
          return (
            <g key={i}>
              <rect x={px(i) - Math.max(6, innerW / n / 2)} y={TOP} width={Math.max(12, innerW / n)} height={innerH} fill="transparent" onMouseEnter={() => setHi(i)} style={{ cursor: "pointer" }} />
              <circle cx={px(i)} cy={py(d.value)} r={active ? 4.5 : 2.6} fill={color} stroke="#161210" strokeWidth={active ? 1.5 : 0} />
              {(i % labelEvery === 0 || i === n - 1) && (
                <text x={px(i)} y={VBH - 8} fill={C.muted} fontSize={9} textAnchor="middle" fontFamily="system-ui">{d.label}</text>
              )}
              <title>{d.label} : {d.value}{unit}</title>
            </g>
          );
        })}
        {hv && (
          <g pointerEvents="none">
            <line x1={px(hi!)} x2={px(hi!)} y1={TOP} y2={TOP + innerH} stroke="rgba(196,154,74,0.35)" strokeWidth={1} />
            <rect x={Math.min(Math.max(px(hi!), 46), VBW - 46) - 44} y={Math.max(py(hv.value) - 34, 2)} width={88} height={26} rx={5} fill="#0d0b09" opacity={0.95} />
            <text x={Math.min(Math.max(px(hi!), 46), VBW - 46)} y={Math.max(py(hv.value) - 34, 2) + 11} fill={C.warm} fontSize={11} fontWeight={800} textAnchor="middle" fontFamily="system-ui">{fmt(hv.value)}{unit}</text>
            <text x={Math.min(Math.max(px(hi!), 46), VBW - 46)} y={Math.max(py(hv.value) - 34, 2) + 21} fill={C.muted} fontSize={8} textAnchor="middle" fontFamily="system-ui">{hv.label}</text>
          </g>
        )}
      </svg>
    </div>
  );
}

// ─── Heatmap trafic : jour (lignes) × heure (colonnes), couleur = canal dominant ──
export type TrafficHeatmapProps = { cells: { day: number; hour: number; sessions: number; channel: string | null }[] };
export function TrafficHeatmap({ cells }: TrafficHeatmapProps) {
  const [hv, setHv] = useState<{ day: number; hour: number; sessions: number; channel: string | null } | null>(null);
  const max = Math.max(...cells.map(c => c.sessions), 1);
  const grid = new Map<string, { sessions: number; channel: string | null }>();
  cells.forEach(c => grid.set(`${c.day}-${c.hour}`, { sessions: c.sessions, channel: c.channel }));
  const hours = Array.from({ length: 24 }, (_, h) => h);
  const hasData = cells.some(c => c.sessions > 0);
  if (!hasData) return <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 20 }}>Pas encore assez de trafic pour la heatmap.</div>;
  const col = `26px repeat(24, minmax(0, 1fr))`;
  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 560 }}>
          <div style={{ display: "grid", gridTemplateColumns: col, gap: 2, marginBottom: 2 }}>
            <div />
            {hours.map(h => <div key={h} style={{ fontSize: 8, color: C.muted, textAlign: "center" }}>{h % 3 === 0 ? h : ""}</div>)}
          </div>
          {WEEKDAYS.map((wd, day) => (
            <div key={day} style={{ display: "grid", gridTemplateColumns: col, gap: 2, marginBottom: 2 }}>
              <div style={{ fontSize: 10, color: C.muted, display: "flex", alignItems: "center" }}>{wd}</div>
              {hours.map(h => {
                const cell = grid.get(`${day}-${h}`) ?? { sessions: 0, channel: null };
                const base = cell.channel ? (CHANNEL_COLORS[cell.channel] ?? "#94a3b8") : C.faint;
                const isHv = hv?.day === day && hv?.hour === h;
                return (
                  <div key={h}
                    onMouseEnter={() => setHv({ day, hour: h, ...cell })}
                    onMouseLeave={() => setHv(null)}
                    title={`${wd} ${h}h — ${cell.sessions} session(s)${cell.channel ? ` · ${CHANNEL_LABELS_FR[cell.channel] ?? cell.channel}` : ""}`}
                    style={{
                      height: 15, borderRadius: 3, cursor: "default",
                      background: cell.sessions > 0 ? base : "rgba(242,237,230,0.04)",
                      opacity: cell.sessions > 0 ? 0.25 + 0.75 * (cell.sessions / max) : 1,
                      outline: isHv ? `1.5px solid ${C.warm}` : "none",
                    }} />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
        {Object.entries(CHANNEL_LABELS_FR).map(([ch, label]) => (
          <span key={ch} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: C.muted }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: CHANNEL_COLORS[ch] ?? "#94a3b8" }} />{label}
          </span>
        ))}
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>
        Couleur = canal dominant du créneau · intensité = volume de sessions (heure de Paris). Survolez une case pour le détail.
      </div>
    </div>
  );
}

// ─── Multi-courbes (N séries) — légende CLIQUABLE (toggle) + jour/mois + infobulle
//     UNIQUE (toutes les séries du jour survolé). Même « savoir-faire » SVG que
//     NewVsReturningChart (viewBox, grille, survol, sélecteur
//     jour/mois) — aucune lib externe, rendu cohérent avec le reste de la page.
export type MultiLineSeries = { key: string; label: string; color: string; total?: number };
export type MultiLineChartProps = {
  byDay:  { date: string; [k: string]: number | string }[];
  series: MultiLineSeries[];
};
export function MultiLineChart({ byDay, series }: MultiLineChartProps) {
  const [gran, setGran]     = useState<"day" | "month">("day");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hi, setHi]         = useState<number | null>(null);

  // Agrégation (somme par métrique) — même logique jour/mois que les autres courbes.
  const data = useMemo(() => {
    const src = Array.isArray(byDay) ? byDay : [];
    if (gran === "month") {
      const m = new Map<string, Record<string, number>>();
      for (const d of src) {
        const key = String(d.date).slice(0, 7); // YYYY-MM
        const acc = m.get(key) ?? {};
        for (const s of series) acc[s.key] = (acc[s.key] ?? 0) + (Number(d[s.key]) || 0);
        m.set(key, acc);
      }
      return [...m.entries()].map(([ym, vals]) => {
        const [yy, mm] = ym.split("-");
        return { key: ym, label: `${MONTHS_FR[Number(mm) - 1] ?? mm} ${yy.slice(2)}`, vals };
      });
    }
    return src.map(d => {
      const vals: Record<string, number> = {};
      for (const s of series) vals[s.key] = Number(d[s.key]) || 0;
      return { key: String(d.date), label: String(d.date).slice(5), vals };
    });
  }, [byDay, gran, series]);

  const active = series.filter(s => !hidden.has(s.key));
  const toggle = (key: string) => setHidden(prev => { const nx = new Set(prev); if (nx.has(key)) nx.delete(key); else nx.add(key); return nx; });

  const VBW = 600, VBH = 200, TOP = 16, BOT = 28, PADX = 10;
  const innerW = VBW - PADX * 2, innerH = VBH - TOP - BOT;
  const max = Math.max(1, ...data.flatMap(d => active.map(s => d.vals[s.key] ?? 0)));
  const n = data.length;
  const px = (i: number) => (n <= 1 ? PADX + innerW / 2 : PADX + (i / (n - 1)) * innerW);
  const py = (v: number) => TOP + innerH - (v / max) * innerH;
  const lineOf = (key: string) => data.map((d, i) => `${i === 0 ? "M" : "L"} ${px(i).toFixed(1)} ${py(d.vals[key] ?? 0).toFixed(1)}`).join(" ");
  const labelEvery = Math.max(1, Math.ceil(n / 12));
  const hv = hi != null ? data[hi] : null;

  return (
    <div>
      {/* Légende CLIQUABLE (toggle) + total par courbe + sélecteur jour/mois */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {series.map(s => {
            const off = hidden.has(s.key);
            return (
              <button key={s.key} onClick={() => toggle(s.key)} title={off ? "Afficher" : "Masquer"}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: off ? C.muted : C.warm, opacity: off ? 0.55 : 1 }}>
                <span style={{ display: "inline-block", width: 14, height: 3, borderRadius: 2, background: off ? C.muted : s.color }} />
                {s.label}{typeof s.total === "number" ? <span style={{ color: C.muted, fontWeight: 800 }}>{" · "}{s.total}</span> : null}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 4, background: "#0d0b09", borderRadius: 9, padding: 3, border: `1px solid ${C.faint}` }}>
          {(["day", "month"] as const).map(g => (
            <button key={g} onClick={() => { setGran(g); setHi(null); }}
              style={{ padding: "5px 12px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 800, background: gran === g ? C.amber : "transparent", color: gran === g ? "#1a1410" : C.muted }}>
              {g === "day" ? "Jour" : "Mois"}
            </button>
          ))}
        </div>
      </div>

      {n === 0 ? (
        <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 30 }}>Aucune donnée</div>
      ) : (
        <div style={{ background: "#161210", borderRadius: 12, padding: "10px 8px", overflowX: "auto" }}>
          <svg viewBox={`0 0 ${VBW} ${VBH}`} style={{ width: "100%", minWidth: 320, display: "block" }} onMouseLeave={() => setHi(null)}>
            {[0, 0.25, 0.5, 0.75, 1].map(t => (
              <line key={t} x1={PADX} x2={VBW - PADX} y1={TOP + innerH - innerH * t} y2={TOP + innerH - innerH * t} stroke={C.faint} strokeWidth={1} />
            ))}
            {active.map(s => (
              <path key={s.key} d={lineOf(s.key)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            ))}
            {data.map((d, i) => (
              <g key={d.key}>
                <rect x={px(i) - Math.max(6, innerW / n / 2)} y={TOP} width={Math.max(12, innerW / n)} height={innerH} fill="transparent" onMouseEnter={() => setHi(i)} style={{ cursor: "pointer" }} />
                {hi === i && active.map(s => <circle key={s.key} cx={px(i)} cy={py(d.vals[s.key] ?? 0)} r={3.5} fill={s.color} stroke="#161210" strokeWidth={1} />)}
                {(i % labelEvery === 0 || i === n - 1) && (
                  <text x={px(i)} y={VBH - 8} fill={C.muted} fontSize={9} textAnchor="middle" fontFamily="system-ui">{d.label}</text>
                )}
              </g>
            ))}
            {/* Infobulle UNIQUE : le jour survolé + toutes les séries ACTIVES d'un coup. */}
            {hv && active.length > 0 && (() => {
              const cx   = Math.min(Math.max(px(hi!), 70), VBW - 70);
              const boxH = 16 + active.length * 12;
              return (
                <g pointerEvents="none">
                  <line x1={px(hi!)} x2={px(hi!)} y1={TOP} y2={TOP + innerH} stroke="rgba(196,154,74,0.35)" strokeWidth={1} />
                  <rect x={cx - 64} y={2} width={128} height={boxH} rx={6} fill="#0d0b09" opacity={0.96} />
                  <text x={cx} y={14} fill={C.warm} fontSize={10} fontWeight={800} textAnchor="middle" fontFamily="system-ui">{hv.label}</text>
                  {active.map((s, k) => (
                    <text key={s.key} x={cx} y={26 + k * 12} fill={s.color} fontSize={9.5} fontWeight={700} textAnchor="middle" fontFamily="system-ui">{s.label} : {hv.vals[s.key] ?? 0}</text>
                  ))}
                </g>
              );
            })()}
          </svg>
        </div>
      )}
    </div>
  );
}
