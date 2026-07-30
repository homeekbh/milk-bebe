"use client";
// app/admin/analytics/trafic/page.tsx (Lot A4) — ex-section « 1 · Acquisition ».
// JSX copié À L'IDENTIQUE de l'ancien page.tsx. Ne fetche QUE page-views.
// WorldVisitorsMap déplacé ici (A4.4).
import { useAnalyticsData } from "@/components/admin/analytics/useAnalyticsData";
import { Skeleton } from "@/components/admin/analytics/widgets";
import { C, CHANNEL_COLORS, CHANNEL_LABELS_FR, WEEKDAYS } from "@/components/admin/analytics/tokens";
import { KpiCard, SectionTitle, Card } from "@/components/admin/analytics/ui";
import { BarChart, DonutChart, SessionsLineChart, LineChart, TrafficHeatmap } from "@/components/admin/analytics/charts";
import { fmtDur, periodLabelOf } from "@/components/admin/analytics/period";
import WorldVisitorsMap from "@/components/admin/WorldVisitorsMap";

export default function TraficPage() {
  const { data, q, narrow, serverError, failedEndpoints, loading } = useAnalyticsData([
    { key: "pageViews", path: "/api/admin/page-views", withBots: true },
  ]);
  const pv = data.pageViews;
  const showDelta   = q.mode === "period" ? q.period !== "all" : true;
  const periodLabel = periodLabelOf(q);
  const th = { padding: "8px 10px", fontWeight: 700, textAlign: "left" as const };
  const td = { padding: "9px 10px" };
  const channelDonut = (pv?.by_channel ?? []).map((c: any) => ({ label: CHANNEL_LABELS_FR[c.channel] ?? c.channel, value: c.sessions, color: CHANNEL_COLORS[c.channel] ?? "#94a3b8" }));

  return (
    <>
      {/* Erreur API explicite (ex. 400 bornes invalides, Lot G-1) — jamais muette (leçon Lot N). */}
      {serverError && (
        <div style={{ marginBottom: 20, padding: "14px 20px", borderRadius: 12, background: "rgba(239,68,68,0.12)", border: `1px solid rgba(239,68,68,0.45)`, color: C.red, fontSize: 14, fontWeight: 800 }}>
          ⛔ {serverError}
        </div>
      )}

      {/* Échecs réseau/serveur (masqué si un message d'erreur explicite est déjà affiché). */}
      {failedEndpoints.length > 0 && !serverError && (
        <div style={{ marginBottom: 28, padding: "14px 20px", borderRadius: 12, background: "rgba(217,93,77,0.10)", border: `1px solid rgba(217,93,77,0.28)`, color: C.red, fontSize: 13, fontWeight: 700 }}>
          ⚠️ Données incomplètes sur : [{failedEndpoints.join(", ")}]
        </div>
      )}

      {/* Fenêtre valide mais aucun trafic — message explicite plutôt que des graphes vides muets. */}
      {!loading && !serverError && pv && (pv.total_views ?? 0) === 0 && (
        <div style={{ marginBottom: 20, padding: "14px 20px", borderRadius: 12, background: "rgba(196,154,74,0.10)", border: `1px solid rgba(196,154,74,0.3)`, color: C.amber, fontSize: 14, fontWeight: 700 }}>
          Aucune donnée de trafic {periodLabel}. Essaie une autre date ou une période plus large.
        </div>
      )}

      {/* ══════════════ 1 · ACQUISITION ══════════════ */}
      <SectionTitle>1 · Acquisition</SectionTitle>

      {pv?.bots_filter_active && (
        <div style={{ marginBottom: 16, padding: "8px 14px", borderRadius: 8, background: "rgba(196,154,74,0.1)", border: `1px solid rgba(196,154,74,0.25)`, color: C.amber, fontSize: 12, fontWeight: 700 }}>
          🤖 Filtre bots actif (heuristique) — {pv.bots_excluded} session(s) exclue(s). Filtre 100 % fiable dès que le user-agent sera capté (colonne page_views.user_agent).
        </div>
      )}

      {!pv ? (
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: narrow ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fit, minmax(180px,1fr))", marginBottom: 24 }}>
          {[0, 1, 2, 3, 4, 5].map(i => <Skeleton key={i} h={110} />)}
        </div>
      ) : (
        <>
          {/* KPIs trafic */}
          <div style={{ display: "grid", gridTemplateColumns: narrow ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
            <KpiCard label="Vues totales"      value={String(pv.total_views ?? 0)}     color={C.blue}   delta={showDelta ? pv.deltas?.views : undefined} />
            <KpiCard label="Sessions uniques"  value={String(pv.unique_sessions ?? 0)} color={C.purple} delta={showDelta ? pv.deltas?.sessions : undefined} />
            <KpiCard label="Visiteurs uniques" value={String(pv.unique_visitors ?? 0)} delta={showDelta ? pv.deltas?.visitors : undefined} />
            <KpiCard label="Durée moyenne"     value={fmtDur(pv.avg_time_on_page)} color={C.green}
                     delta={showDelta ? pv.deltas?.avg_time : undefined}
                     pending={pv.avg_time_on_page == null || pv.avg_time_on_page === 0}
                     title="Ces données se remplissent après les premières navigations complètes" />
            <KpiCard label="Taux de rebond"    value={pv.bounce_rate == null ? "—" : `${pv.bounce_rate}%`}
                     pending={pv.bounce_rate == null || pv.bounce_rate === 0}
                     title="Ces données se remplissent après les premières navigations complètes" />
            <KpiCard label="Pages / session"   value={Number(pv.pages_per_session ?? 0).toFixed(1)} />
          </div>

          {/* Sources de trafic + Campagnes UTM */}
          <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <Card title="📡 Sources de trafic" lexique="Canal">
              <DonutChart data={channelDonut} />
              {(pv.by_channel ?? []).length > 0 && (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 14 }}>
                  <thead><tr style={{ color: C.muted }}><th style={th}>Canal</th><th style={th}>Sessions</th><th style={th}>%</th></tr></thead>
                  <tbody>
                    {pv.by_channel.map((c: any) => (
                      <tr key={c.channel} style={{ borderTop: `1px solid ${C.faint}` }}>
                        <td style={td}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: CHANNEL_COLORS[c.channel] ?? "#94a3b8", marginRight: 8 }} />{CHANNEL_LABELS_FR[c.channel] ?? c.channel}</td>
                        <td style={{ ...td, color: C.warm, fontWeight: 700 }}>{c.sessions}</td>
                        <td style={{ ...td, color: C.muted }}>{c.pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
            <Card title="🎯 Campagnes UTM">
              {(pv.top_campaigns ?? []).length === 0 ? <div style={{ color: C.muted, fontSize: 13 }}>Aucune campagne UTM trackée.</div> : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead><tr style={{ color: C.muted }}><th style={th}>Campagne</th><th style={th}>Source</th><th style={th}>Sessions</th></tr></thead>
                    <tbody>
                      {pv.top_campaigns.map((c: any, i: number) => (
                        <tr key={c.campaign + i} style={{ borderTop: `1px solid ${C.faint}` }}>
                          <td style={{ ...td, color: C.warm }}>{c.campaign}</td>
                          <td style={{ ...td, color: C.muted }}>{c.source}</td>
                          <td style={{ ...td, color: C.amber, fontWeight: 700 }}>{c.sessions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          {/* Pages d'entrée + Top référents */}
          <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <Card title="🛬 Pages d'entrée (landing)" lexique="Pages d'entrée">
              {(pv.entry_pages ?? []).length === 0 ? <div style={{ color: C.muted, fontSize: 13 }}>Aucune page d'entrée trackée.</div> : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead><tr style={{ color: C.muted }}><th style={th}>Page d'entrée</th><th style={th}>Sessions</th><th style={th}>Rebond</th></tr></thead>
                    <tbody>
                      {pv.entry_pages.map((e: any) => (
                        <tr key={e.entry_page} style={{ borderTop: `1px solid ${C.faint}` }}>
                          <td style={{ ...td, color: C.warm }}>{e.entry_page}</td>
                          <td style={{ ...td, color: C.amber, fontWeight: 700 }}>{e.sessions}</td>
                          <td style={{ ...td, color: C.muted }}>{e.bounce_rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
            <Card title="🔗 Top référents">
              {(pv.top_referrers ?? []).length === 0 ? <div style={{ color: C.muted, fontSize: 13 }}>Aucun référent externe.</div> : (
                <div style={{ display: "grid", gap: 8 }}>
                  {pv.top_referrers.map((r: any) => (
                    <div key={r.domain} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: C.warm }}>{r.domain}</span><span style={{ color: C.amber, fontWeight: 700 }}>{r.sessions}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Heatmap croisée : trafic par heure × jour, coloré par canal dominant */}
          <div style={{ marginBottom: 24 }}>
            <Card title="🗓️ Trafic par heure × jour (canal dominant)" lexique="Canal">
              <TrafficHeatmap cells={pv.traffic_heatmap ?? []} />
            </Card>
          </div>

          {/* Vues par jour (courbe) + Évolution des sessions */}
          <div style={{ marginBottom: 24 }}>
            <Card title="📈 Vues par jour" lexique="Vues totales">
              <LineChart data={(pv.by_day ?? []).map((d: any) => ({ label: String(d.date).slice(5), value: d.views }))} color={C.blue} />
              <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>
                Sessions uniques sur la période : <span style={{ color: C.warm, fontWeight: 700 }}>{pv.unique_sessions ?? 0}</span>
              </div>
            </Card>
          </div>
          <div style={{ marginBottom: 24 }}>
            <Card title="📉 Évolution des sessions" lexique="Sessions uniques">
              <SessionsLineChart byDay={pv.by_day ?? []} />
            </Card>
          </div>

          {/* Trafic par heure / par jour — distributions (barres conservées) */}
          <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <Card title="🕐 Trafic par heure (heure Paris)">
              <BarChart data={(pv.by_hour ?? []).map((h: any) => ({ label: h.hour % 4 === 0 ? `${h.hour}h` : "", value: h.views }))} height={120} />
            </Card>
            <Card title="📅 Trafic par jour">
              <BarChart data={(pv.by_weekday ?? []).map((d: any) => ({ label: WEEKDAYS[d.day] ?? String(d.day), value: d.views }))} height={120} />
            </Card>
          </div>

          {/* Carte des visiteurs (déplacée ici depuis Comportement — A4.4) */}
          <div style={{ marginBottom: 24 }}>
            <Card title="🗺️ Carte des visiteurs">
              <WorldVisitorsMap cities={pv.by_city ?? []} />
            </Card>
          </div>
        </>
      )}
    </>
  );
}
