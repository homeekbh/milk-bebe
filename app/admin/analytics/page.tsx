"use client";
// app/admin/analytics/page.tsx (Lot A5) — VUE D'ENSEMBLE (route racine).
// Périodes calendaires + courbe comparative (série courante vs précédente).
// Fetche page-views + kpis + conversion (KPIs/funnel) et /series (courbe +
// variations tronquées). Le mode weekday (conservé) rend l'agrégat G-3b à la
// place de la courbe comparative. Aucun indicateur nouveau hors comparaison.
import { useEffect, useState, useMemo } from "react";
import { useAnalyticsData, adminFetch } from "@/components/admin/analytics/useAnalyticsData";
import { useAnalyticsRefresh } from "@/components/admin/analytics/refresh-context";
import { Skeleton } from "@/components/admin/analytics/widgets";
import { C } from "@/components/admin/analytics/tokens";
import { KpiCard, SectionTitle, Card, LEXIQUE } from "@/components/admin/analytics/ui";
import { FunnelChart, LineChart } from "@/components/admin/analytics/charts";
import ComparisonChart, { type MetricKey } from "@/components/admin/analytics/ComparisonChart";
import { eur, WEEKDAY_LONG, weekdayOccurrences, fmtDayShort, periodLabelOf, granularityOf, compareRangeOf, truncationSuffix } from "@/components/admin/analytics/period";

const METRICS: { key: MetricKey; label: string }[] = [
  { key: "sessions", label: "Sessions" },
  { key: "visitors", label: "Visiteurs" },
  { key: "views",    label: "Vues" },
];

export default function OverviewPage() {
  const { data, q, narrow, serverError, failedEndpoints, loading } = useAnalyticsData([
    { key: "pageViews",  path: "/api/admin/page-views", withBots: true },
    { key: "kpis",       path: "/api/admin/analytics/kpis" },
    { key: "conversion", path: "/api/admin/analytics/conversion", withBots: true },
  ]);
  const { refreshNonce } = useAnalyticsRefresh();
  const pv = data.pageViews, kpis = data.kpis, conversion = data.conversion;
  const wk = q.mode === "weekday";
  const { weekday, wdDepth } = q;
  const showDelta   = q.mode === "period" ? q.period !== "all" : true;
  const periodLabel = periodLabelOf(q);
  const th = { padding: "8px 10px", fontWeight: 700, textAlign: "left" as const };
  const td = { padding: "9px 10px" };

  const [metric, setMetric] = useState<MetricKey>("sessions");

  // ── Courbe comparative : /series (Lot A5). Non fetchée en mode weekday. ──────
  const g   = granularityOf(q.from, q.to);
  const cmp = compareRangeOf(q.preset, q.from, q.to, q.compare === "wd");
  const [series, setSeries] = useState<any>(null);
  useEffect(() => {
    if (wk || !q.from || !q.to) { setSeries(null); return; }
    let cancelled = false;
    const url = `/api/admin/analytics/series?from=${q.from}&to=${q.to}&cfrom=${cmp.cfrom}&cto=${cmp.cto}&g=${g}&bots=${q.bots ? "exclude" : "all"}`;
    (async () => {
      try { const r = await adminFetch(url); const j = await r.json(); if (!cancelled) setSeries(j?.error ? null : (j.data ?? null)); }
      catch { if (!cancelled) setSeries(null); }
    })();
    return () => { cancelled = true; };
  }, [wk, q.from, q.to, cmp.cfrom, cmp.cto, g, q.bots, refreshNonce]);

  // Variation vs comparaison (compare_truncated si période en cours, sinon compare_totals).
  const truncated = series?.compare_truncated != null;
  const compareLabel = cmp.label + (truncated ? truncationSuffix(g) : "");
  const cmpT: any = series?.compare_truncated ?? series?.compare_totals ?? null;
  const variation = (m: MetricKey): number | undefined =>
    series && cmpT && cmpT[m] > 0 ? ((series.totals[m] - cmpT[m]) / cmpT[m]) * 100 : undefined;

  // Source des KPIs trafic : /series (préset/custom) ou page-views (weekday).
  const tsrc = wk
    ? (pv ? { sessions: pv.unique_sessions ?? 0, visitors: pv.unique_visitors ?? 0, views: pv.total_views ?? 0 } : null)
    : (series ? series.totals : null);
  const dLabel = wk ? "vs période préc." : compareLabel;

  // G-3b — occurrences du jour de semaine sélectionné (ordre chronologique).
  const wdOccs = useMemo(() => (wk ? weekdayOccurrences(weekday, wdDepth) : []), [wk, weekday, wdDepth]);

  return (
    <>
      {serverError && (
        <div style={{ marginBottom: 20, padding: "14px 20px", borderRadius: 12, background: "rgba(239,68,68,0.12)", border: `1px solid rgba(239,68,68,0.45)`, color: C.red, fontSize: 14, fontWeight: 800 }}>
          ⛔ {serverError}
        </div>
      )}
      {failedEndpoints.length > 0 && !serverError && (
        <div style={{ marginBottom: 28, padding: "14px 20px", borderRadius: 12, background: "rgba(217,93,77,0.10)", border: `1px solid rgba(217,93,77,0.28)`, color: C.red, fontSize: 13, fontWeight: 700 }}>
          ⚠️ Données incomplètes sur : [{failedEndpoints.join(", ")}]
        </div>
      )}
      {!loading && !serverError && pv && (pv.total_views ?? 0) === 0 && (
        <div style={{ marginBottom: 20, padding: "14px 20px", borderRadius: 12, background: "rgba(196,154,74,0.10)", border: `1px solid rgba(196,154,74,0.3)`, color: C.amber, fontSize: 14, fontWeight: 700 }}>
          Aucune donnée de trafic {periodLabel}. Essaie une autre date ou une période plus large.
        </div>
      )}

      {/* ══════════════ G-3b · AGRÉGAT « TOUS LES <JOUR> » (mode weekday conservé) ══ */}
      {wk && (
        <>
          <div style={{ marginBottom: 16, padding: "12px 18px", borderRadius: 12, background: "rgba(196,154,74,0.10)", border: `1px solid rgba(196,154,74,0.3)`, color: C.amber, fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>
            📆 « Tous les {WEEKDAY_LONG[weekday]}s » : le détail par occurrence ci-dessous porte sur le <b>trafic</b> (sessions/vues) — seule métrique ventilée par jour. Les autres blocs couvrent la <b>plage entière</b>{wdOccs.length ? ` du ${fmtDayShort(wdOccs[0])} au ${fmtDayShort(wdOccs[wdOccs.length - 1])}` : ""} (contiguë), pas uniquement les {WEEKDAY_LONG[weekday]}s.
          </div>
          <div style={{ marginBottom: 24 }}>
            <Card title={`📆 Tous les ${WEEKDAY_LONG[weekday]}s — ${wdDepth} dernières occurrences`}>
              {(() => {
                const occSet = new Set(wdOccs);
                const occRows = (pv?.by_day ?? []).filter((d: any) => occSet.has(d.date));
                if (occRows.length === 0) return <div style={{ color: C.muted, fontSize: 13 }}>Aucune donnée de trafic sur ces journées (période antérieure au tracking ?).</div>;
                const totSess  = occRows.reduce((s: number, d: any) => s + (d.sessions || 0), 0);
                const totViews = occRows.reduce((s: number, d: any) => s + (d.views || 0), 0);
                return (
                  <>
                    <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginBottom: 14 }}>
                      <div><div style={{ fontSize: 22, fontWeight: 950, color: C.purple }}>{totSess}</div><div style={{ fontSize: 11, color: C.muted }}>sessions cumulées</div></div>
                      <div><div style={{ fontSize: 22, fontWeight: 950, color: C.blue }}>{totViews}</div><div style={{ fontSize: 11, color: C.muted }}>vues cumulées</div></div>
                      <div><div style={{ fontSize: 22, fontWeight: 950, color: C.warm }}>{Math.round(totSess / occRows.length)}</div><div style={{ fontSize: 11, color: C.muted }}>sessions / {WEEKDAY_LONG[weekday]} (moy.)</div></div>
                    </div>
                    <LineChart data={occRows.map((d: any) => ({ label: `${String(d.date).slice(8)}/${String(d.date).slice(5, 7)}`, value: d.sessions }))} color={C.purple} height={160} />
                    <div style={{ overflowX: "auto", marginTop: 12 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead><tr style={{ color: C.muted }}><th style={th}>Date</th><th style={th}>Sessions</th><th style={th}>Vues</th></tr></thead>
                        <tbody>
                          {occRows.map((d: any) => (
                            <tr key={d.date} style={{ borderTop: `1px solid ${C.faint}` }}>
                              <td style={{ ...td, color: C.warm }}>{fmtDayShort(d.date)}</td>
                              <td style={{ ...td, color: C.amber, fontWeight: 700 }}>{d.sessions}</td>
                              <td style={{ ...td, color: C.muted }}>{d.views}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}
            </Card>
          </div>
        </>
      )}

      {/* KPIs principaux + variation vs comparaison */}
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
        {tsrc ? (
          <>
            <KpiCard label="Sessions uniques"  value={String(tsrc.sessions ?? 0)} color={C.purple} delta={wk ? (showDelta ? pv.deltas?.sessions : undefined) : variation("sessions")} deltaLabel={dLabel} />
            <KpiCard label="Visiteurs uniques" value={String(tsrc.visitors ?? 0)} delta={wk ? (showDelta ? pv.deltas?.visitors : undefined) : variation("visitors")} deltaLabel={dLabel} />
            <KpiCard label="Vues totales"      value={String(tsrc.views ?? 0)}    color={C.blue} delta={wk ? (showDelta ? pv.deltas?.views : undefined) : variation("views")} deltaLabel={dLabel} />
          </>
        ) : <><Skeleton h={110} /><Skeleton h={110} /><Skeleton h={110} /></>}
        {kpis ? (
          <>
            <KpiCard label="Chiffre d'affaires" value={eur(kpis.revenue)}       color={C.amber} delta={showDelta ? kpis.revenue_delta_pct : undefined} />
            <KpiCard label="Panier moyen"        value={eur(kpis.avg_basket, 2)} delta={showDelta ? kpis.basket_delta_pct : undefined} />
            <KpiCard label="Taux de conversion"  value={conversion ? `${conversion.conversion_rate.toFixed(2)}%` : "—"} sub={conversion ? `${conversion.purchases} vente(s) / ${conversion.sessions} session(s)` : ""} color={C.green} delta={showDelta ? conversion?.conversion_delta_pct ?? undefined : undefined} />
          </>
        ) : <><Skeleton h={110} /><Skeleton h={110} /><Skeleton h={110} /></>}
      </div>

      {/* Courbe comparative (remplace SessionsLineChart) — hors mode weekday */}
      {!wk && (
        <div style={{ marginBottom: 24 }}>
          <Card title="📊 Évolution comparée" lexique="Sessions uniques">
            <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
              {METRICS.map(mo => {
                const on = metric === mo.key;
                return (
                  <button key={mo.key} onClick={() => setMetric(mo.key)}
                    style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 800, background: on ? C.amber : "transparent", color: on ? "#1a1410" : C.muted }}>
                    {mo.label}
                  </button>
                );
              })}
            </div>
            {!series ? <Skeleton h={180} /> : (
              <ComparisonChart points={series.points} compare={series.compare} granularity={series.granularity}
                metric={metric} label={METRICS.find(m => m.key === metric)!.label} currentLabel={periodLabel} compareLabel={cmp.label} narrow={narrow} />
            )}
          </Card>
        </div>
      )}

      {/* Tunnel de conversion (graphe existant) */}
      <div style={{ marginBottom: 24 }}>
        <Card title="🔻 Tunnel de conversion" lexique="Tunnel de conversion">
          {(pv?.funnel ?? []).length === 0 ? <div style={{ color: C.muted, fontSize: 13 }}>Données insuffisantes sur la période.</div> : (
            <>
              <FunnelChart steps={pv.funnel} />
              <div style={{ fontSize: 11, color: C.muted, marginTop: 12, lineHeight: 1.6 }}>
                « Checkout » = event <b>begin_checkout</b> (clic « Passer au paiement » / « Commander », panier non vide) — plus de proxy page vue. « Achat » = commandes valides de la période (pas de session_id sur les commandes → comparaison indicative). Les begin_checkout n'existent qu'à partir du déploiement de ce suivi : l'étape peut être basse tant que la donnée s'accumule.
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Lexique (reste accessible en bas de la Vue d'ensemble) */}
      <SectionTitle>Lexique</SectionTitle>
      <div style={{ background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.faint}`, display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: "10px 28px" }}>
        {Object.entries(LEXIQUE).map(([terme, { icon, def }]) => (
          <div key={terme} style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
            <span style={{ color: C.warm, fontWeight: 800 }}>{icon} {terme}</span> — {def}
          </div>
        ))}
      </div>
    </>
  );
}
