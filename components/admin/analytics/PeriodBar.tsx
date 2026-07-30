"use client";
// components/admin/analytics/PeriodBar.tsx
// Barre de contrôle STICKY partagée. Périodes CALENDAIRES (présets, Lot A5) +
// calendrier custom + mode weekday (conservé) + toggle bots + Maj/Rafraîchir.
// L'état vit dans l'URL : lecture via useSearchParams, écriture via router.replace.
// Aucun fetch ici — Maj/Rafraîchir passent par AnalyticsRefreshContext.
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useIsNarrow } from "@/lib/useIsNarrow";
import { C } from "@/components/admin/analytics/tokens";
import {
  PRESETS, dateInputStyle, selectStyle, DATA_MIN_DATE, todayYmd, WEEKDAY_LONG,
  compareRangeOf, parseQuery, toSearchParams, DEFAULT_QUERY, type AnalyticsQuery,
} from "@/components/admin/analytics/period";
import { useAnalyticsRefresh } from "@/components/admin/analytics/refresh-context";

export default function PeriodBar() {
  const narrow = useIsNarrow();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const q = parseQuery(new URLSearchParams(sp.toString()));
  const { preset, mode, weekday, wdDepth } = q;
  const isWeekday = mode === "weekday";

  const { lastUpdated, refreshing, requestRefresh } = useAnalyticsRefresh();

  const set = (patch: Partial<AnalyticsQuery>) => {
    const params = toSearchParams({ ...q, ...patch }).toString();
    router.replace(params ? `${pathname}?${params}` : pathname, { scroll: false });
  };

  const todayStr = todayYmd();

  // Édition du calendrier → bascule en préset "custom" (plage explicite).
  function applyRange(nf: string, nt: string) {
    let a = nf, b = nt;
    if (a && b && a > b) { const t = a; a = b; b = t; }
    if (a && b) set({ preset: "custom", mode: "range", from: a, to: b, compare: "" });
  }

  // Comparaison par défaut (libellé) — masquée en mode weekday.
  const cmp = compareRangeOf(preset, q.from, q.to, q.compare === "wd");
  const canAltCompare = !isWeekday && (preset === "today" || preset === "yesterday");

  return (
    <div style={{
      position: "sticky", top: "var(--admin-header-h, 78px)", zIndex: 30,
      // Marges négatives (bord-à-bord) SEULEMENT en desktop. En mobile on les
      // retire : le padding conteneur change et un -40px déborderait à droite.
      background: C.bg, margin: narrow ? "0 0 18px" : "0 -40px 24px", padding: narrow ? "10px 0" : "12px 40px",
      borderBottom: `1px solid ${C.faint}`, boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
      display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, flexWrap: "wrap",
    }}>
      {lastUpdated && (
        <span style={{ fontSize: 12, color: C.muted, whiteSpace: "nowrap", marginRight: "auto" }}>
          Maj {lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}
      <button onClick={() => set({ bots: !q.bots })} title="Exclure les sessions détectées comme bots (heuristique : rebond instantané + scroll 0 + crawlers connus). S'applique au trafic (page_views)."
        style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${q.bots ? C.amber : C.faint}`, background: q.bots ? "rgba(196,154,74,0.15)" : C.card, color: q.bots ? C.amber : C.muted, fontWeight: 800, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
        {q.bots ? "🤖 Bots exclus" : "🤖 Exclure bots"}
      </button>
      <button onClick={requestRefresh} disabled={refreshing} title="Rafraîchir maintenant"
        style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${C.faint}`, background: C.card, color: C.warm, fontWeight: 800, fontSize: 13, cursor: refreshing ? "wait" : "pointer", opacity: refreshing ? 0.6 : 1, whiteSpace: "nowrap" }}>
        {refreshing ? "⟳ …" : "⟳ Rafraîchir"}
      </button>

      {/* Présets calendaires (Lot A5) */}
      <div style={{ display: "flex", gap: 6, background: C.card, borderRadius: 12, padding: 4, border: `1px solid ${C.faint}`, flexWrap: "wrap", opacity: isWeekday ? 0.85 : 1 }}>
        {PRESETS.filter(p => p.key !== "custom").map(p => {
          const on = !isWeekday && preset === p.key;
          return (
            <button key={p.key}
              onClick={() => set({ preset: p.key, mode: "range", compare: "" })}
              style={{ padding: "8px 12px", borderRadius: 9, border: "none", cursor: "pointer", minHeight: 44, background: on ? C.warm : "transparent", color: on ? "#000" : C.muted, fontWeight: 800, fontSize: 13, transition: "all 0.15s", whiteSpace: "nowrap" }}>
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Calendrier personnalisé (Lot G-2) — édition ⇒ préset custom. Bordure ambre = actif. */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", background: C.card, borderRadius: 12, padding: "4px 10px", border: `1px solid ${!isWeekday && preset === "custom" ? C.amber : C.faint}` }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: !isWeekday && preset === "custom" ? C.amber : C.muted, fontWeight: 800 }}>
          Du
          <input type="date" value={q.from} min={DATA_MIN_DATE} max={todayStr}
            onChange={e => applyRange(e.target.value, q.to)} style={dateInputStyle(!isWeekday && preset === "custom")} />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: !isWeekday && preset === "custom" ? C.amber : C.muted, fontWeight: 800 }}>
          au
          <input type="date" value={q.to} min={q.from || DATA_MIN_DATE} max={todayStr}
            onChange={e => applyRange(q.from, e.target.value)} style={dateInputStyle(!isWeekday && preset === "custom")} />
        </label>
      </div>

      {/* Comparaison — libellé + alternative J-7 (today/yesterday). Masqué en weekday. */}
      {!isWeekday && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", background: C.card, borderRadius: 12, padding: "4px 10px", border: `1px solid ${C.faint}` }}>
          <span style={{ fontSize: 12, color: C.muted, fontWeight: 700, whiteSpace: "nowrap" }}>⚖️ {cmp.label}</span>
          {canAltCompare && (
            <select value={q.compare} onChange={e => set({ compare: e.target.value })} style={selectStyle(q.compare === "wd")}>
              <option value="">période précédente</option>
              <option value="wd">même jour, S-1</option>
            </select>
          )}
        </div>
      )}

      {/* Mode weekday CONSERVÉ (Lot G-3b) — agrégat « tous les <jour> ». */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", background: C.card, borderRadius: 12, padding: "4px 10px", border: `1px solid ${isWeekday ? C.amber : C.faint}` }}>
        <span style={{ fontSize: 12, color: isWeekday ? C.amber : C.muted, fontWeight: 800 }}>tous les</span>
        <select value={weekday} onChange={e => set({ mode: "weekday", weekday: Number(e.target.value), compare: "" })}
          style={selectStyle(isWeekday)}>
          {WEEKDAY_LONG.map((w, i) => <option key={i} value={i}>{w}s</option>)}
        </select>
        <select value={wdDepth} onChange={e => set({ mode: "weekday", wdDepth: Number(e.target.value), compare: "" })}
          style={selectStyle(isWeekday)}>
          {[4, 8, 12].map(n => <option key={n} value={n}>{n} occ.</option>)}
        </select>
        {isWeekday && (
          <button onClick={() => set({ mode: "range", preset: DEFAULT_QUERY.preset })} title="Revenir aux périodes calendaires"
            style={{ padding: "6px 10px", borderRadius: 8, border: "none", background: "transparent", color: C.muted, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>✕</button>
        )}
      </div>
    </div>
  );
}
