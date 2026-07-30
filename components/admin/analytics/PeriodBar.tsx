"use client";
// components/admin/analytics/PeriodBar.tsx
// Barre de contrôle STICKY partagée (Lot A3) : sélecteur de période (4 modes) +
// toggle « Exclure bots » + Maj/Rafraîchir. Le rendu (DOM + styles inline +
// position:sticky) est reproduit À L'OCTET PRÈS depuis l'ancien page.tsx.
// L'état vit dans l'URL : lecture via useSearchParams, écriture via router.replace.
// Aucun fetch ici — Maj/Rafraîchir passent par AnalyticsRefreshContext.
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useIsNarrow } from "@/lib/useIsNarrow";
import { C } from "@/components/admin/analytics/tokens";
import {
  PERIODS, dateInputStyle, selectStyle, DATA_MIN_DATE, todayYmd, shiftYmd, WEEKDAY_LONG,
  parseQuery, toSearchParams, type AnalyticsQuery,
} from "@/components/admin/analytics/period";
import { useAnalyticsRefresh } from "@/components/admin/analytics/refresh-context";

export default function PeriodBar() {
  const narrow = useIsNarrow();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const q = parseQuery(new URLSearchParams(sp.toString()));
  const { mode, period, weekday, wdDepth } = q;
  const dayStr = q.date, rangeFrom = q.from, rangeTo = q.to, compareDate = q.compare, excludeBots = q.bots;

  const { lastUpdated, refreshing, requestRefresh } = useAnalyticsRefresh();

  // Écrit l'état dans l'URL (remplace l'entrée courante, sans scroll). N'écrit que
  // les valeurs non-défaut → URL propre et partageable.
  const set = (patch: Partial<AnalyticsQuery>) => {
    const params = toSearchParams({ ...q, ...patch }).toString();
    router.replace(params ? `${pathname}?${params}` : pathname, { scroll: false });
  };

  const todayStr = todayYmd();

  // Applique une plage en corrigeant « au » < « du » : on ÉCHANGE les deux dates
  // (préserve les deux choix de l'utilisateur, jamais de requête vouée au 400).
  function applyRange(nf: string, nt: string) {
    let a = nf, b = nt;
    if (a && b && a > b) { const t = a; a = b; b = t; }
    if (a && b) set({ from: a, to: b, date: "", compare: "", mode: "range" }); // plage complète → mode range (exclusif)
    else set({ from: a, to: b, mode: "period" });                             // incomplète/vidée → retour période
  }

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
      <button onClick={() => set({ bots: !excludeBots })} title="Exclure les sessions détectées comme bots (heuristique : rebond instantané + scroll 0 + crawlers connus). S'applique au trafic (page_views)."
        style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${excludeBots ? C.amber : C.faint}`, background: excludeBots ? "rgba(196,154,74,0.15)" : C.card, color: excludeBots ? C.amber : C.muted, fontWeight: 800, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
        {excludeBots ? "🤖 Bots exclus" : "🤖 Exclure bots"}
      </button>
      <button onClick={requestRefresh} disabled={refreshing} title="Rafraîchir maintenant"
        style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${C.faint}`, background: C.card, color: C.warm, fontWeight: 800, fontSize: 13, cursor: refreshing ? "wait" : "pointer", opacity: refreshing ? 0.6 : 1, whiteSpace: "nowrap" }}>
        {refreshing ? "⟳ …" : "⟳ Rafraîchir"}
      </button>
      <div style={{ display: "flex", gap: 6, background: C.card, borderRadius: 12, padding: 4, border: `1px solid ${mode === "period" ? C.faint : C.faint}`, opacity: mode === "period" ? 1 : 0.85 }}>
        {PERIODS.map(p => {
          const on = mode === "period" && period === p.key;
          return (
            <button key={p.key}
              onClick={() => { set({ mode: "period", period: p.key, date: "", from: "", to: "", compare: "" }); }}
              style={{ padding: "8px 16px", borderRadius: 9, border: "none", cursor: "pointer", minHeight: 44, background: on ? C.warm : "transparent", color: on ? "#000" : C.muted, fontWeight: 800, fontSize: 13, transition: "all 0.15s" }}>
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Sélecteur calendaire (Lot G-2) — jour précis OU plage. Champs natifs
          <input type=date>. Bordure ambre = mode actif. flexWrap → empile en 390px. */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", background: C.card, borderRadius: 12, padding: "4px 10px", border: `1px solid ${mode !== "period" ? C.amber : C.faint}` }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: mode === "day" ? C.amber : C.muted, fontWeight: 800 }}>
          Jour
          <input type="date" value={mode === "day" ? dayStr : ""} min={DATA_MIN_DATE} max={todayStr}
            onChange={e => { const v = e.target.value; if (!v) { set({ date: "", mode: "period" }); return; } set({ date: v, from: "", to: "", mode: "day" }); }}
            style={dateInputStyle(mode === "day")} />
        </label>
        <span style={{ fontSize: 11, color: C.muted }}>ou</span>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: mode === "range" ? C.amber : C.muted, fontWeight: 800 }}>
          Du
          <input type="date" value={rangeFrom} min={DATA_MIN_DATE} max={todayStr}
            onChange={e => applyRange(e.target.value, rangeTo)} style={dateInputStyle(mode === "range")} />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: mode === "range" ? C.amber : C.muted, fontWeight: 800 }}>
          au
          <input type="date" value={rangeTo} min={rangeFrom || DATA_MIN_DATE} max={todayStr}
            onChange={e => applyRange(rangeFrom, e.target.value)} style={dateInputStyle(mode === "range")} />
        </label>
      </div>

      {/* G-3a — comparaison de 2 jours (visible en mode jour). Bordure ambre = comparaison active. */}
      {mode === "day" && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", background: C.card, borderRadius: 12, padding: "4px 10px", border: `1px solid ${compareDate ? C.amber : C.faint}` }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: compareDate ? C.amber : C.muted, fontWeight: 800 }}>
            comparer à
            <input type="date" value={compareDate} min={DATA_MIN_DATE} max={todayStr}
              onChange={e => set({ compare: e.target.value })} style={dateInputStyle(!!compareDate)} />
          </label>
          <button onClick={() => dayStr && set({ compare: shiftYmd(dayStr, -1) })} title="Comparer au jour précédent (J-1)"
            style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.faint}`, background: "transparent", color: C.muted, fontWeight: 800, fontSize: 12, cursor: "pointer", minHeight: 44 }}>jour préc.</button>
          <button onClick={() => dayStr && set({ compare: shiftYmd(dayStr, -7) })} title="Comparer au même jour de la semaine précédente (J-7)"
            style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.faint}`, background: "transparent", color: C.muted, fontWeight: 800, fontSize: 12, cursor: "pointer", minHeight: 44 }}>même jour, S-1</button>
          {compareDate && (
            <button onClick={() => set({ compare: "" })} title="Retirer la comparaison"
              style={{ padding: "8px 10px", borderRadius: 8, border: "none", background: "transparent", color: C.muted, fontWeight: 800, fontSize: 14, cursor: "pointer", minHeight: 44 }}>✕</button>
          )}
        </div>
      )}

      {/* G-3b — agrégat « tous les <jour> ». Sélection = 4e mode calendaire. */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", background: C.card, borderRadius: 12, padding: "4px 10px", border: `1px solid ${mode === "weekday" ? C.amber : C.faint}` }}>
        <span style={{ fontSize: 12, color: mode === "weekday" ? C.amber : C.muted, fontWeight: 800 }}>tous les</span>
        <select value={weekday} onChange={e => set({ weekday: Number(e.target.value), mode: "weekday", date: "", from: "", to: "", compare: "" })}
          style={selectStyle(mode === "weekday")}>
          {WEEKDAY_LONG.map((w, i) => <option key={i} value={i}>{w}s</option>)}
        </select>
        <select value={wdDepth} onChange={e => set({ wdDepth: Number(e.target.value), mode: "weekday", date: "", from: "", to: "", compare: "" })}
          style={selectStyle(mode === "weekday")}>
          {[4, 8, 12].map(n => <option key={n} value={n}>{n} occ.</option>)}
        </select>
      </div>
    </div>
  );
}
