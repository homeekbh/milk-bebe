"use client";
// components/admin/analytics/PeriodBar.tsx (compacté A7.B2)
// Barre de contrôle STICKY sur UNE ligne :
//   [Ce mois-ci ▾] 01/07 → 30/07 [vs mois dernier ▾] · [Bots] [↻] · Maj 21:11
// - présets dans un menu déroulant (n'affiche que l'actif)
// - champs de date SEULEMENT si preset=custom ; sinon bornes en texte
// - weekday REPLIÉ derrière une icône calendrier (pleinement fonctionnel)
// L'état vit dans l'URL ; Maj/Rafraîchir passent par AnalyticsRefreshContext.
import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useIsNarrow } from "@/lib/useIsNarrow";
import { C } from "@/components/admin/analytics/tokens";
import {
  PRESETS, dateInputStyle, DATA_MIN_DATE, todayYmd, WEEKDAY_LONG,
  compareRangeOf, parseQuery, toSearchParams, DEFAULT_QUERY,
  type AnalyticsQuery, type PresetKey,
} from "@/components/admin/analytics/period";
import { useAnalyticsRefresh } from "@/components/admin/analytics/refresh-context";

const fmtShort = (ymd: string) => ymd ? `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}` : "—";

// Styles compacts (thème sombre).
const ctrl = (active = false): React.CSSProperties => ({
  background: "#0d0b09", color: active ? "#f2ede6" : "rgba(242,237,230,0.8)",
  border: `1px solid ${active ? "#c49a4a" : "rgba(242,237,230,0.15)"}`,
  borderRadius: 8, padding: "7px 9px", fontSize: 12, fontWeight: 800,
  minHeight: 38, colorScheme: "dark", cursor: "pointer",
});

export default function PeriodBar() {
  const narrow = useIsNarrow();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const q = parseQuery(new URLSearchParams(sp.toString()));
  const { preset, mode, weekday, wdDepth } = q;
  const isWeekday = mode === "weekday";
  const isCustom  = !isWeekday && preset === "custom";

  const [wdOpen, setWdOpen] = useState(false);
  const showWd = isWeekday || wdOpen;

  const { lastUpdated, refreshing, requestRefresh } = useAnalyticsRefresh();

  const set = (patch: Partial<AnalyticsQuery>) => {
    const params = toSearchParams({ ...q, ...patch }).toString();
    router.replace(params ? `${pathname}?${params}` : pathname, { scroll: false });
  };
  const todayStr = todayYmd();

  function applyRange(nf: string, nt: string) {
    let a = nf, b = nt;
    if (a && b && a > b) { const t = a; a = b; b = t; }
    if (a && b) set({ preset: "custom", mode: "range", from: a, to: b, compare: "" });
  }

  const cmp = compareRangeOf(preset, q.from, q.to, q.compare === "wd");
  const canAlt = !isWeekday && (preset === "today" || preset === "yesterday");

  return (
    <div style={{
      position: "sticky", top: "var(--admin-header-h, 60px)", zIndex: 30,
      background: C.bg, margin: narrow ? "0 0 14px" : "0 -40px 18px", padding: narrow ? "8px 0" : "10px 40px",
      borderBottom: `1px solid ${C.faint}`, boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
      display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
    }}>
      {/* Préset (menu déroulant — n'affiche que l'actif) */}
      <select value={isWeekday ? "" : preset} onChange={e => { const v = e.target.value as PresetKey; if (v) set({ preset: v, mode: "range", compare: "" }); }}
        style={{ ...ctrl(!isWeekday), opacity: isWeekday ? 0.6 : 1 }}>
        {isWeekday && <option value="">— période —</option>}
        {PRESETS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
      </select>

      {/* Bornes : éditables SI custom, sinon texte */}
      {isCustom ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <input type="date" value={q.from} min={DATA_MIN_DATE} max={todayStr}
            onChange={e => applyRange(e.target.value, q.to)} style={dateInputStyle(true)} />
          <span style={{ color: C.muted }}>→</span>
          <input type="date" value={q.to} min={q.from || DATA_MIN_DATE} max={todayStr}
            onChange={e => applyRange(q.from, e.target.value)} style={dateInputStyle(true)} />
        </span>
      ) : (
        <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, whiteSpace: "nowrap" }}>{fmtShort(q.from)} → {fmtShort(q.to)}</span>
      )}

      {/* Comparaison : sélecteur (today/yesterday) ou libellé */}
      {!isWeekday && (canAlt ? (
        <select value={q.compare} onChange={e => set({ compare: e.target.value })} style={ctrl(true)}>
          <option value="">⚖️ {cmp.label}</option>
          <option value="wd">⚖️ vs même jour, S-1</option>
        </select>
      ) : (
        <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, whiteSpace: "nowrap" }}>⚖️ {cmp.label}</span>
      ))}

      {/* Icône calendrier : replie/déplie le mode weekday (conservé) */}
      <button onClick={() => setWdOpen(v => !v)} title="Agrégat « tous les <jour> »"
        style={{ ...ctrl(isWeekday), padding: "7px 10px" }}>📅</button>
      {showWd && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.card, borderRadius: 8, padding: "3px 8px", border: `1px solid ${isWeekday ? C.amber : C.faint}` }}>
          <span style={{ fontSize: 11, color: isWeekday ? C.amber : C.muted, fontWeight: 800 }}>tous les</span>
          <select value={weekday} onChange={e => set({ mode: "weekday", weekday: Number(e.target.value), compare: "" })} style={ctrl(isWeekday)}>
            {WEEKDAY_LONG.map((w, i) => <option key={i} value={i}>{w}s</option>)}
          </select>
          <select value={wdDepth} onChange={e => set({ mode: "weekday", wdDepth: Number(e.target.value), compare: "" })} style={ctrl(isWeekday)}>
            {[4, 8, 12].map(n => <option key={n} value={n}>{n} occ.</option>)}
          </select>
          {isWeekday && (
            <button onClick={() => { setWdOpen(false); set({ mode: "range", preset: DEFAULT_QUERY.preset }); }} title="Revenir aux périodes"
              style={{ background: "transparent", border: "none", color: C.muted, fontWeight: 800, fontSize: 14, cursor: "pointer" }}>✕</button>
          )}
        </span>
      )}

      <span style={{ color: C.faint }}>·</span>
      <button onClick={() => set({ bots: !q.bots })} title="Exclure les sessions détectées comme bots (rebond instantané + scroll 0 + crawlers connus)."
        style={{ ...ctrl(q.bots), background: q.bots ? "rgba(196,154,74,0.15)" : "#0d0b09", color: q.bots ? C.amber : "rgba(242,237,230,0.8)" }}>
        🤖 {q.bots ? "Bots exclus" : "Bots"}
      </button>
      <button onClick={requestRefresh} disabled={refreshing} title="Rafraîchir maintenant"
        style={{ ...ctrl(false), cursor: refreshing ? "wait" : "pointer", opacity: refreshing ? 0.6 : 1 }}>
        {refreshing ? "⟳ …" : "⟳"}
      </button>

      {lastUpdated && (
        <span style={{ fontSize: 11, color: C.muted, whiteSpace: "nowrap", marginLeft: "auto" }}>
          Maj {lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}
    </div>
  );
}
