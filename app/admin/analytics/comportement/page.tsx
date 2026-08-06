"use client";
// app/admin/analytics/comportement/page.tsx (Lot A4) — ex-section « 2 · Comportement ».
// Les cartes Paniers / Favoris ont MIGRÉ vers l'onglet dédié « Paniers & Favoris »
// (déplacement, pas duplication). Ici : tunnel de conversion + engagement + profil
// visiteur. Fetche uniquement page-views.
import { useState } from "react";
import { useAnalyticsData } from "@/components/admin/analytics/useAnalyticsData";
import AnalyticsComparison from "@/components/admin/analytics/AnalyticsComparison";
import { BehaviorPlaceholder } from "@/components/admin/analytics/widgets";
import { C } from "@/components/admin/analytics/tokens";
import { SectionTitle, Card } from "@/components/admin/analytics/ui";
import { DonutChart, HBars, NewVsReturningChart, FunnelChart } from "@/components/admin/analytics/charts";
import { fmtDur, DEVICE_ICON, periodLabelOf } from "@/components/admin/analytics/period";

export default function ComportementPage() {
  const { data, q, narrow, serverError, failedEndpoints, loading } = useAnalyticsData([
    { key: "pageViews", path: "/api/admin/page-views", withBots: true },
  ]);
  const pv = data.pageViews;
  const periodLabel = periodLabelOf(q);
  // Dénominateur commun des répartitions par session (défaut #8 : chaque bloc totalise ceci).
  const sessTotal: number = pv?.sessions_total ?? pv?.unique_sessions ?? 0;
  const denom = (n: number) => <div style={{ fontSize: 11, color: C.muted, marginTop: 10, paddingTop: 8, borderTop: `1px solid ${C.faint}` }}>Σ = {n} session(s) · par session</div>;

  const [showAllPages,     setShowAllPages]     = useState(false);
  const [showAllCountries, setShowAllCountries] = useState(false);
  const [showAllCities,    setShowAllCities]    = useState(false);

  const th = { padding: "8px 10px", fontWeight: 700, textAlign: "left" as const };
  const td = { padding: "9px 10px" };
  const nvr      = pv?.new_vs_returning ?? { new: 0, returning: 0 };
  const nvrTotal = (nvr.new ?? 0) + (nvr.returning ?? 0);
  const pctNew   = nvrTotal > 0 ? Math.round((nvr.new / nvrTotal) * 100) : 0;
  const nvrDonut = [
    { label: "Nouveaux",   value: nvr.new,       color: C.amber },
    { label: "Récurrents", value: nvr.returning, color: C.green },
  ].filter(d => d.value > 0);
  const allPages   = pv?.top_pages ?? [];
  const pagesShown = showAllPages ? allPages : allPages.slice(0, 10);

  return (
    <>
      <AnalyticsComparison metrics={[{ key: "product_views", label: "Vues produit" }, { key: "add_to_cart", label: "Ajouts panier" }, { key: "begin_checkout", label: "Checkouts initiés" }]} />
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

      {/* ══════════════ 2 · COMPORTEMENT ══════════════ */}
      <SectionTitle>2 · Comportement</SectionTitle>

      {/* Tunnel de conversion (les cartes Paniers / Favoris ont migré vers l'onglet « Paniers & Favoris »). */}
      <div style={{ marginBottom: 24 }}>
        <Card title="🔻 Tunnel de conversion" lexique="Tunnel de conversion">
          {(pv?.funnel ?? []).length === 0 ? <div style={{ color: C.muted, fontSize: 13 }}>Données insuffisantes sur la période.</div> : (
            <>
              <FunnelChart steps={pv.funnel} />
              <div style={{ fontSize: 11, color: C.muted, marginTop: 12, lineHeight: 1.6 }}>
                « Checkout » = event <b>begin_checkout</b> (clic « Passer au paiement » / « Commander », panier non vide) — plus de proxy page vue. « Achat » = commandes <b>clientes web</b> valides de la période (hors sorties manuelles, cadeaux et collabs — pas de session_id sur les commandes → comparaison indicative). Les begin_checkout n'existent qu'à partir du déploiement de ce suivi : l'étape peut être basse tant que la donnée s'accumule.
              </div>
            </>
          )}
        </Card>
      </div>

      {pv && (
        <>
          {/* Top pages vues */}
          <div style={{ marginBottom: 24 }}>
            <Card title="📄 Top pages vues">
              {allPages.length === 0 ? <div style={{ color: C.muted, fontSize: 13 }}>Aucune vue trackée pour l'instant.</div> : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead><tr style={{ color: C.muted }}>
                      <th style={th}>Page</th><th style={th}>Vues</th><th style={th}>Sessions</th><th style={th}>Durée</th><th style={th}>Scroll</th><th style={th}>Rebond</th>
                    </tr></thead>
                    <tbody>
                      {pagesShown.map((p: any) => (
                        <tr key={p.page_path} style={{ borderTop: `1px solid ${C.faint}` }}>
                          <td style={{ ...td, color: C.warm }}>
                            {String(p.page_path).startsWith("/produits/") && <span style={{ fontSize: 10, fontWeight: 800, color: "#000", background: C.amber, borderRadius: 5, padding: "1px 6px", marginRight: 6 }}>Produit</span>}
                            {p.page_path}
                          </td>
                          <td style={{ ...td, color: C.amber, fontWeight: 700 }}>{p.views}</td>
                          <td style={{ ...td, color: C.muted }}>{p.unique_sessions}</td>
                          <td style={{ ...td, color: C.muted }}>{fmtDur(p.avg_time)}</td>
                          <td style={{ ...td, color: C.muted }}>{p.avg_scroll}%</td>
                          <td style={{ ...td, color: C.muted }}>{p.bounce_rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {allPages.length > 10 && (
                    <button onClick={() => setShowAllPages(v => !v)} style={{ marginTop: 12, background: "none", border: `1px solid ${C.faint}`, color: C.amber, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      {showAllPages ? "Voir moins" : `Voir plus (${allPages.length - 10})`}
                    </button>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Profondeur de scroll + Durée PAR PAGE VUE (distributions par page vue, pas par session — défaut #7) */}
          <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <Card title="🖱️ Profondeur de scroll (par page vue)" lexique="Scroll depth">
              {(pv.scroll_distribution ?? []).every((d: any) => !d.count)
                ? <BehaviorPlaceholder />
                : <>
                    <HBars data={pv.scroll_distribution.map((d: any) => ({ label: d.bucket, value: d.count }))} color={C.blue} />
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>Réparti par page vue — {(pv.scroll_distribution ?? []).reduce((s: number, d: any) => s + (d.count || 0), 0)} page(s) mesurée(s).</div>
                  </>}
            </Card>
            <Card title="⏱️ Durée par page vue" lexique="Durée moyenne">
              {(pv.time_distribution ?? []).every((d: any) => !d.count)
                ? <BehaviorPlaceholder />
                : <>
                    <HBars data={pv.time_distribution.map((d: any) => ({ label: d.bucket, value: d.count }))} color={C.green} />
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>Temps par PAGE VUE (pas par session) — {(pv.time_distribution ?? []).reduce((s: number, d: any) => s + (d.count || 0), 0)} page(s) mesurée(s).</div>
                  </>}
            </Card>
          </div>

          {/* Nouveaux vs récurrents (agrégat + évolution dans le temps) */}
          <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1.4fr", gap: 16, marginBottom: 24 }}>
            <Card title="✨ Nouveaux vs récurrents" lexique="Nouveaux visiteurs">
              <DonutChart data={nvrDonut} />
              <div style={{ fontSize: 13, color: C.muted, marginTop: 10 }}>
                <span style={{ color: C.amber, fontWeight: 900, fontSize: 20 }}>{pctNew}%</span> de nouveaux visiteurs
              </div>
            </Card>
            <Card title="📈 Nouveaux vs récurrents dans le temps" lexique="Nouveaux visiteurs">
              <NewVsReturningChart byDay={pv.new_returning_by_day ?? []} />
            </Card>
          </div>

          {/* Top pays / Top villes (trafic) — profil visiteur, juste après Nouveaux vs récurrents */}
          <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <Card title="🌍 Top pays">
              {(pv.by_country ?? []).length === 0 ? <div style={{ color: C.muted, fontSize: 13, fontStyle: "italic" }}>Disponible uniquement en production Vercel.</div> : (
                <div style={{ display: "grid", gap: 8 }}>
                  {(showAllCountries ? pv.by_country : pv.by_country.slice(0, 10)).map((c: any) => (
                    <div key={c.country} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: C.warm }}>{c.country}</span><span style={{ color: C.amber, fontWeight: 700 }}>{c.sessions}</span>
                    </div>
                  ))}
                  {pv.by_country.length > 10 && (
                    <button onClick={() => setShowAllCountries(v => !v)} style={{ marginTop: 6, background: "none", border: `1px solid ${C.faint}`, color: C.amber, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", justifySelf: "start" }}>
                      {showAllCountries ? "Réduire" : `Voir tout (${pv.by_country.length})`}
                    </button>
                  )}
                </div>
              )}
            </Card>
            <Card title="🏙️ Top villes (trafic)">
              {(pv.by_city ?? []).length === 0 ? <div style={{ color: C.muted, fontSize: 13, fontStyle: "italic" }}>Disponible uniquement en production Vercel.</div> : (
                <div style={{ display: "grid", gap: 8 }}>
                  {(showAllCities ? pv.by_city : pv.by_city.slice(0, 10)).map((c: any, i: number) => (
                    <div key={c.city + i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: C.warm }}>{c.city}{c.region ? <span style={{ color: C.muted }}> · {c.region}</span> : null}</span>
                      <span style={{ color: C.amber, fontWeight: 700 }}>{c.sessions}</span>
                    </div>
                  ))}
                  {pv.by_city.length > 10 && (
                    <button onClick={() => setShowAllCities(v => !v)} style={{ marginTop: 6, background: "none", border: `1px solid ${C.faint}`, color: C.amber, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", justifySelf: "start" }}>
                      {showAllCities ? "Réduire" : `Voir tout (${pv.by_city.length})`}
                    </button>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Appareils / Système / Navigateur — répartitions par session, « Inconnu » inclus,
              somme == Σ sessions (défaut #8) */}
          <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
            <Card title="📱 Appareils">
              <div style={{ display: "grid", gap: 8 }}>
                {(pv.by_device ?? []).length === 0 ? <div style={{ color: C.muted, fontSize: 13 }}>—</div> :
                  pv.by_device.map((d: any) => (
                    <div key={d.device_type} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: d.device_type === "Inconnu" ? C.muted : C.warm }}>{DEVICE_ICON[d.device_type] ?? "•"} {d.device_type}</span>
                      <span style={{ color: C.amber, fontWeight: 700 }}>{d.sessions} · {d.pct}%</span>
                    </div>
                  ))}
              </div>
              {(pv.by_device ?? []).length > 0 && denom(sessTotal)}
            </Card>
            <Card title="💿 Système">
              <div style={{ display: "grid", gap: 8 }}>
                {(pv.by_os ?? []).length === 0 ? <div style={{ color: C.muted, fontSize: 13 }}>—</div> :
                  pv.by_os.map((d: any) => (
                    <div key={d.os} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: d.os === "Inconnu" ? C.muted : C.warm }}>{d.os}</span><span style={{ color: C.amber, fontWeight: 700 }}>{d.sessions} · {d.pct}%</span>
                    </div>
                  ))}
              </div>
              {(pv.by_os ?? []).length > 0 && denom(sessTotal)}
            </Card>
            <Card title="🌐 Navigateur">
              <div style={{ display: "grid", gap: 8 }}>
                {(pv.by_browser ?? []).length === 0 ? <div style={{ color: C.muted, fontSize: 13 }}>—</div> :
                  pv.by_browser.map((d: any) => (
                    <div key={d.browser} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: d.browser === "Inconnu" ? C.muted : C.warm }}>{d.browser}</span><span style={{ color: C.amber, fontWeight: 700 }}>{d.sessions} · {d.pct}%</span>
                    </div>
                  ))}
              </div>
              {(pv.by_browser ?? []).length > 0 && denom(sessTotal)}
            </Card>
          </div>
        </>
      )}
    </>
  );
}
