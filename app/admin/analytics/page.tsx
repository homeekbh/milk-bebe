"use client";
// app/admin/analytics/page.tsx (Lot A4) — VUE D'ENSEMBLE (route racine).
// Ne fetche que page-views + kpis + conversion. Contenu : KPIs principaux
// (réutilise les KpiCard existants) + Évolution des sessions + Tunnel de
// conversion + le Lexique en bas. Héberge aussi les overlays de comparaison
// calendaire G-3a (jour vs jour) et G-3b (« tous les <jour> ») — seule page à
// disposer de kpis+conversion+page-views. Aucun indicateur nouveau (A4.3).
import { useEffect, useState, useMemo } from "react";
import { useAnalyticsData, adminFetch } from "@/components/admin/analytics/useAnalyticsData";
import { Skeleton, DeltaBadge } from "@/components/admin/analytics/widgets";
import { C } from "@/components/admin/analytics/tokens";
import { KpiCard, SectionTitle, Card, LEXIQUE } from "@/components/admin/analytics/ui";
import { SessionsLineChart, FunnelChart, LineChart } from "@/components/admin/analytics/charts";
import { eur, pctDelta, fmtDayShort, shiftYmd, WEEKDAY_LONG, weekdayOccurrences, periodLabelOf } from "@/components/admin/analytics/period";

export default function OverviewPage() {
  const { data, q, narrow, serverError, failedEndpoints, loading } = useAnalyticsData([
    { key: "pageViews",  path: "/api/admin/page-views", withBots: true },
    { key: "kpis",       path: "/api/admin/analytics/kpis" },
    { key: "conversion", path: "/api/admin/analytics/conversion", withBots: true },
  ]);
  const pv = data.pageViews, kpis = data.kpis, conversion = data.conversion;
  const { mode, period, weekday, wdDepth } = q;
  const dayStr = q.date, compareDate = q.compare, excludeBots = q.bots;
  const showDelta   = mode === "period" ? period !== "all" : true;
  const periodLabel = periodLabelOf(q);
  const th = { padding: "8px 10px", fontWeight: 700, textAlign: "left" as const };
  const td = { padding: "9px 10px" };

  // G-3a — charge le jour de RÉFÉRENCE (headline uniquement) quand une comparaison
  // est active. Même toggle bots que le terme principal (comparaison à réglages
  // identiques). Cleared dès qu'on quitte le mode jour ou qu'on efface la 2e date.
  const [cmp, setCmp] = useState<any>(null);
  useEffect(() => {
    if (mode !== "day" || !dayStr || !compareDate) { setCmp(null); return; }
    let cancelled = false;
    const bots = excludeBots ? "exclude" : "all";
    const g = async (u: string): Promise<any> => {
      try { const r = await adminFetch(u); if (!r.ok) return null; const j = await r.json(); return j.error ? null : (j.data ?? null); }
      catch { return null; }
    };
    (async () => {
      const [pvC, kpiC, convC] = await Promise.all([
        g(`/api/admin/page-views?date=${compareDate}&bots=${bots}`),
        g(`/api/admin/analytics/kpis?date=${compareDate}`),
        g(`/api/admin/analytics/conversion?date=${compareDate}&bots=${bots}`),
      ]);
      if (!cancelled) setCmp({ pv: pvC, kpis: kpiC, conversion: convC });
    })();
    return () => { cancelled = true; };
  }, [mode, dayStr, compareDate, excludeBots]);

  // G-3b — occurrences du jour de semaine sélectionné (ordre chronologique).
  const wdOccs = useMemo(() => (mode === "weekday" ? weekdayOccurrences(weekday, wdDepth) : []), [mode, weekday, wdDepth]);

  return (
    <>
      {/* Erreur API explicite (ex. 400 bornes invalides, Lot G-1) — jamais muette (leçon Lot N). */}
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

      {/* ══════════════ G-3a · COMPARAISON JOUR vs JOUR ══════════════ */}
      {mode === "day" && compareDate && (
        <div style={{ marginBottom: 24, background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.faint}` }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.warm, marginBottom: 4 }}>
            ⚖️ {fmtDayShort(dayStr)} vs {fmtDayShort(compareDate)}{compareDate === shiftYmd(dayStr, -7) ? " (même jour, S-1)" : ""}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
            Réglage « {excludeBots ? "bots exclus" : "tous visiteurs"} » appliqué aux deux jours.
            {((cmp?.pv?.unique_sessions ?? 0) < 20 || (pv?.unique_sessions ?? 0) < 20) && <span style={{ color: C.amber }}> · ⚠️ faible volume : écarts % à interpréter avec prudence.</span>}
          </div>
          {!cmp ? <Skeleton h={120} /> : (
            <div style={{ display: "grid", gap: 8 }}>
              {!narrow && (
                <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 10, fontSize: 11, color: C.muted, fontWeight: 800, textTransform: "uppercase" as const }}>
                  <span>Métrique</span><span>{fmtDayShort(dayStr)}</span><span>{fmtDayShort(compareDate)}</span><span>Écart</span>
                </div>
              )}
              {[
                { label: "Sessions",           better: "up" as const,   sel: pv?.unique_sessions ?? 0,        ref: cmp?.pv?.unique_sessions ?? 0,        fmt: (v: number) => String(v) },
                { label: "Vues",               better: "up" as const,   sel: pv?.total_views ?? 0,            ref: cmp?.pv?.total_views ?? 0,            fmt: (v: number) => String(v) },
                { label: "Chiffre d'affaires", better: "up" as const,   sel: kpis?.revenue ?? 0,              ref: cmp?.kpis?.revenue ?? 0,              fmt: (v: number) => eur(v) },
                { label: "Commandes",          better: "up" as const,   sel: kpis?.orders_count ?? 0,         ref: cmp?.kpis?.orders_count ?? 0,         fmt: (v: number) => String(v) },
                { label: "Taux de conversion", better: "up" as const,   sel: conversion?.conversion_rate ?? 0, ref: cmp?.conversion?.conversion_rate ?? 0, fmt: (v: number) => v.toFixed(2) + "%" },
                { label: "Taux de rebond",     better: "down" as const, sel: pv?.bounce_rate ?? 0,            ref: cmp?.pv?.bounce_rate ?? 0,            fmt: (v: number) => `${v}%` },
              ].map(m => {
                const lowVol = (cmp?.pv?.unique_sessions ?? 0) < 20 || (pv?.unique_sessions ?? 0) < 20;
                return (
                  <div key={m.label} style={{ display: "grid", gridTemplateColumns: narrow ? "1fr 1fr" : "1.4fr 1fr 1fr 1fr", gap: 10, alignItems: "center", borderTop: `1px solid ${C.faint}`, paddingTop: 8, fontSize: 13 }}>
                    <span style={{ color: C.warm, fontWeight: 700 }}>{m.label}</span>
                    <span style={{ color: C.warm }}>{narrow && <span style={{ color: C.muted, fontSize: 11 }}>{fmtDayShort(dayStr)} · </span>}{m.fmt(m.sel)}</span>
                    <span style={{ color: C.muted }}>{narrow && <span style={{ color: C.muted, fontSize: 11 }}>{fmtDayShort(compareDate)} · </span>}{m.fmt(m.ref)}</span>
                    <span style={{ gridColumn: narrow ? "1 / -1" : "auto" }}><DeltaBadge d={pctDelta(m.sel, m.ref)} better={m.better} lowVol={lowVol} /></span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════ G-3b · AGRÉGAT « TOUS LES <JOUR> » ══════════════ */}
      {mode === "weekday" && (
        <>
          <div style={{ marginBottom: 16, padding: "12px 18px", borderRadius: 12, background: "rgba(196,154,74,0.10)", border: `1px solid rgba(196,154,74,0.3)`, color: C.amber, fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>
            📆 « Tous les {WEEKDAY_LONG[weekday]}s » : le détail par occurrence ci-dessous porte sur le <b>trafic</b> (sessions/vues) — seule métrique ventilée par jour. Les autres blocs du tableau de bord couvrent la <b>plage entière</b>{wdOccs.length ? ` du ${fmtDayShort(wdOccs[0])} au ${fmtDayShort(wdOccs[wdOccs.length - 1])}` : ""} (contiguë), pas uniquement les {WEEKDAY_LONG[weekday]}s.
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

      {/* KPIs principaux (réutilise les KpiCard existants — aucun indicateur nouveau) */}
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
        {pv ? (
          <>
            <KpiCard label="Sessions uniques"  value={String(pv.unique_sessions ?? 0)} color={C.purple} delta={showDelta ? pv.deltas?.sessions : undefined} />
            <KpiCard label="Visiteurs uniques" value={String(pv.unique_visitors ?? 0)} delta={showDelta ? pv.deltas?.visitors : undefined} />
            <KpiCard label="Vues totales"      value={String(pv.total_views ?? 0)}     color={C.blue} delta={showDelta ? pv.deltas?.views : undefined} />
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

      {/* Évolution des sessions (graphe existant) */}
      <div style={{ marginBottom: 24 }}>
        <Card title="📉 Évolution des sessions" lexique="Sessions uniques">
          {!pv ? <Skeleton h={150} /> : <SessionsLineChart byDay={pv.by_day ?? []} />}
        </Card>
      </div>

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

      {/* Lexique (reste accessible en bas de la Vue d'ensemble — A4.3) */}
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
