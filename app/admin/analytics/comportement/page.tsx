"use client";
// app/admin/analytics/comportement/page.tsx (Lot A4) — ex-section « 2 · Comportement ».
// JSX copié À L'IDENTIQUE (hors WorldVisitorsMap, déplacé dans /trafic — A4.4).
// Fetche page-views + wishlist + abandoned-carts.
import { useState, useMemo } from "react";
import { useAnalyticsData } from "@/components/admin/analytics/useAnalyticsData";
import AnalyticsComparison from "@/components/admin/analytics/AnalyticsComparison";
import { Skeleton, BehaviorPlaceholder } from "@/components/admin/analytics/widgets";
import { C } from "@/components/admin/analytics/tokens";
import { SectionTitle, Card } from "@/components/admin/analytics/ui";
import { DonutChart, HBars, NewVsReturningChart, FunnelChart, BarChart } from "@/components/admin/analytics/charts";
import { fmtDur, DEVICE_ICON, periodLabelOf, eur } from "@/components/admin/analytics/period";

export default function ComportementPage() {
  const { data, q, narrow, serverError, failedEndpoints, loading } = useAnalyticsData([
    { key: "pageViews", path: "/api/admin/page-views", withBots: true },
    { key: "wishlist",  path: "/api/admin/analytics/wishlist" },
    { key: "cartAdds",  path: "/api/admin/analytics/cart-adds" },
    { key: "abandonedCarts", path: "/api/admin/abandoned-carts", kind: "raw", withQuery: true,
      normalize: (j: any) => (j && Array.isArray(j.carts))
        ? { value: { carts: j.carts, all_time: j.all_time ?? { total: 0, converted: 0 } }, ok: true }
        : { value: { carts: [], all_time: { total: 0, converted: 0 } }, ok: false } },
  ]);
  const pv = data.pageViews;
  const wishlist = data.wishlist;
  const cartAdds = data.cartAdds;
  const ac = data.abandonedCarts ?? { carts: [], all_time: { total: 0, converted: 0 } };
  const abandonedCarts: any[] = ac.carts ?? [];
  const allTimeCarts = ac.all_time ?? { total: 0, converted: 0 };
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

  const cartsStats = useMemo(() => {
    const total     = abandonedCarts.length;
    const converted = abandonedCarts.filter((c: any) => c.converted).length;
    const recovery  = total > 0 ? (converted / total) * 100 : 0;
    return { total, converted, recovery };
  }, [abandonedCarts]);

  // Statut dérivé du TEMPS (aucune colonne statut en base) : seuil « En attente » = 1h,
  // seuil implicite du cron de relance. Récupéré = converted ; sinon Abandonné.
  const cartStatus = (c: any): { label: string; color: string } => {
    if (c.converted) return { label: "Récupéré", color: C.green };
    const ageMs = Date.now() - new Date(c.created_at).getTime();
    if (ageMs < 3600_000) return { label: "En attente", color: C.amber };
    return { label: "Abandonné", color: C.red };
  };
  const fmtDateTime = (s: string): string => {
    const d = new Date(s);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

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

      {/* Tunnel de conversion + Paniers abandonnés + Favoris (les trois en tête de section) */}
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1.4fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
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
        <Card title="🛒 Paniers abandonnés" lexique="Paniers abandonnés">
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginBottom: 12 }}>
            <div><div style={{ fontSize: 22, fontWeight: 950, color: C.warm }}>{cartsStats.total}</div><div style={{ fontSize: 11, color: C.muted }}>paniers identifiés · période</div></div>
            <div><div style={{ fontSize: 22, fontWeight: 950, color: C.green }}>{cartsStats.converted}</div><div style={{ fontSize: 11, color: C.muted }}>récupérés · période</div></div>
            <div><div style={{ fontSize: 22, fontWeight: 950, color: C.amber }}>{cartsStats.recovery.toFixed(0)}%</div><div style={{ fontSize: 11, color: C.muted }}>récupération · période</div></div>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
            Tout-temps : <b style={{ color: C.warm }}>{allTimeCarts.total}</b> paniers identifiés · <b style={{ color: C.green }}>{allTimeCarts.converted}</b> récupérés.
          </div>
          <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
            Un panier n'est enregistré <b>que si un email a été saisi</b> — les paniers anonymes (la majorité) ne sont pas comptés ici. Relance email automatique 1h / 24h / 72h.
          </div>
        </Card>
        <Card title="❤️ Favoris (mises en wishlist)" lexique="Favoris">
          {!wishlist ? <Skeleton h={120} /> : (
            <>
              <div style={{ display: "flex", gap: 22, flexWrap: "wrap", marginBottom: 10 }}>
                <div><div style={{ fontSize: 22, fontWeight: 950, color: C.amber }}>{wishlist.active ?? 0}</div><div style={{ fontSize: 11, color: C.muted }}>favoris actifs</div></div>
                <div><div style={{ fontSize: 22, fontWeight: 950, color: C.red }}>{wishlist.removed_manual ?? 0}</div><div style={{ fontSize: 11, color: C.muted }}>retirés (abandon)</div></div>
                <div><div style={{ fontSize: 22, fontWeight: 950, color: C.green }}>{wishlist.removed_purchased ?? 0}</div><div style={{ fontSize: 11, color: C.muted }}>retirés (achat) ✓</div></div>
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
                Actifs = ajouts − retraits (tous motifs) sur la période. « Retirés (achat) » = le favori a mené à une commande — signal positif.
              </div>
              {(wishlist.top_products ?? []).length === 0 ? (
                <div style={{ color: C.muted, fontSize: 13 }}>Aucun favori tracké sur la période (donnée non rétroactive — depuis le déploiement du tracking).</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead><tr style={{ color: C.muted, textAlign: "left" }}>
                      <th style={{ padding: "8px 10px", fontWeight: 700 }}>Produit</th>
                      <th style={{ padding: "8px 10px", fontWeight: 700 }}>Favoris</th>
                    </tr></thead>
                    <tbody>
                      {wishlist.top_products.map((p: any) => (
                        <tr key={p.id} style={{ borderTop: `1px solid ${C.faint}` }}>
                          <td style={{ padding: "10px 10px", color: C.warm }}>{p.name}</td>
                          <td style={{ padding: "10px 10px", color: C.amber, fontWeight: 800 }}>{p.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* ══════════════ Détail paniers / ajouts / favoris (lecture enrichie) ══════════════ */}
      {/* 🔴 Cohérence des unités : ces indicateurs mesurent des OBJETS différents. */}
      <div style={{ marginBottom: 24, padding: "14px 18px", borderRadius: 12, background: "rgba(196,154,74,0.08)", border: `1px solid rgba(196,154,74,0.22)`, fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
        <b style={{ color: C.warm }}>Lecture des compteurs — objets différents, ne pas additionner.</b><br />
        Le tunnel compte des <b style={{ color: C.warm }}>sessions</b> (un visiteur = 1, même avec plusieurs ajouts). Les « ajouts au panier » comptent des <b style={{ color: C.warm }}>événements</b> (chaque clic). Les « paniers » comptent des <b style={{ color: C.warm }}>entités identifiées</b> (un email saisi = une ligne). Les « ventes » comptent des <b style={{ color: C.warm }}>commandes</b> clientes. Seuls les paniers avec email saisi sont listés — les paniers anonymes ne sont pas enregistrés.
      </div>

      {/* 1 — Liste détaillée des paniers identifiés (bornée à la période) */}
      <SectionTitle>Paniers détaillés · {periodLabel}</SectionTitle>
      <div style={{ marginBottom: 24 }}>
        <Card title="🧺 Paniers identifiés de la période">
          {abandonedCarts.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 13 }}>Aucun panier identifié sur la période (aucun email saisi). Les paniers anonymes ne sont pas enregistrés.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ color: C.muted, textAlign: "left" }}>
                  <th style={th}>Client</th><th style={th}>Statut</th><th style={th}>Montant</th><th style={th}>Contenu</th><th style={th}>Créé</th><th style={th}>Dernière activité</th><th style={th}>Relances</th>
                </tr></thead>
                <tbody>
                  {abandonedCarts.map((c: any) => {
                    const st = cartStatus(c);
                    const rel = [c.relance_1, c.relance_2, c.relance_3].filter(Boolean).length;
                    const items = Array.isArray(c.items) ? c.items : [];
                    return (
                      <tr key={c.id} style={{ borderTop: `1px solid ${C.faint}`, verticalAlign: "top" }}>
                        <td style={{ ...td, color: C.warm }}>
                          <div style={{ fontWeight: 800 }}>{c.prenom || "—"}</div>
                          <div style={{ fontSize: 11, color: C.muted, wordBreak: "break-all" }}>{c.email}</div>
                        </td>
                        <td style={td}><span style={{ fontSize: 11, fontWeight: 800, color: "#000", background: st.color, borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" }}>{st.label}</span></td>
                        <td style={{ ...td, color: C.amber, fontWeight: 800, whiteSpace: "nowrap" }}>{eur(c.total, 2)}</td>
                        <td style={{ ...td, color: C.muted }}>
                          {items.length === 0 ? "—" : items.map((i: any, k: number) => (
                            <div key={k} style={{ lineHeight: 1.5 }}>{i.name} <span style={{ color: C.warm, fontWeight: 700 }}>×{i.quantity ?? 1}</span></div>
                          ))}
                        </td>
                        <td style={{ ...td, color: C.muted, whiteSpace: "nowrap" }}>{fmtDateTime(c.created_at)}</td>
                        <td style={{ ...td, color: C.muted, whiteSpace: "nowrap" }}>{c.updated_at ? fmtDateTime(c.updated_at) : "—"}</td>
                        <td style={{ ...td, color: C.muted }}>{rel}/3</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 10, lineHeight: 1.6 }}>
                Statut dérivé du temps : <b style={{ color: C.amber }}>En attente</b> (créé &lt; 1h), <b style={{ color: C.red }}>Abandonné</b> (plus ancien, non payé), <b style={{ color: C.green }}>Récupéré</b> (commande passée). « Dernière activité » = dernière sauvegarde du panier.
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* 2 — Ajouts au panier par produit et par date (analytics_events, agrégé serveur) */}
      <SectionTitle>Ajouts au panier · {periodLabel}</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <Card title="➕ Ajouts par produit">
          {!cartAdds ? <Skeleton h={160} /> : (cartAdds.by_product ?? []).length === 0 ? (
            <div style={{ color: C.muted, fontSize: 13 }}>Aucun ajout au panier sur la période.</div>
          ) : (
            <>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>
                <b style={{ color: C.warm }}>{cartAdds.total_adds}</b> ajouts (événements) sur la période — un visiteur peut en générer plusieurs.
              </div>
              <HBars data={cartAdds.by_product.slice(0, 12).map((p: any) => ({ label: p.kind === "pack" ? `${p.name} · Pack` : p.name, value: p.count }))} />
            </>
          )}
        </Card>
        <Card title="📅 Ajouts dans le temps">
          {!cartAdds ? <Skeleton h={160} /> : (cartAdds.by_day ?? []).every((d: any) => !d.count) ? (
            <div style={{ color: C.muted, fontSize: 13 }}>Aucun ajout au panier sur la période.</div>
          ) : (
            <BarChart data={(cartAdds.by_day ?? []).map((d: any) => ({ label: String(d.date).slice(5), value: d.count }))} />
          )}
        </Card>
      </div>

      {/* 3 — Historique des favoris (analytics_events add/remove wishlist) */}
      <SectionTitle>Historique des favoris · {periodLabel}</SectionTitle>
      <div style={{ marginBottom: 24 }}>
        <Card title="❤️ Mouvements de favoris" lexique="Favoris">
          {!wishlist ? <Skeleton h={120} /> : (wishlist.history ?? []).length === 0 ? (
            <div style={{ color: C.muted, fontSize: 13 }}>Aucun mouvement de favori sur la période (donnée non rétroactive — depuis le déploiement du tracking).</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ color: C.muted, textAlign: "left" }}>
                  <th style={th}>Produit</th><th style={th}>Action</th><th style={th}>Date</th>
                </tr></thead>
                <tbody>
                  {wishlist.history.map((h: any, k: number) => (
                    <tr key={k} style={{ borderTop: `1px solid ${C.faint}` }}>
                      <td style={{ ...td, color: C.warm }}>{h.name}</td>
                      <td style={td}>
                        {h.type === "add"
                          ? <span style={{ color: C.amber, fontWeight: 700 }}>❤️ Ajout</span>
                          : <span style={{ color: h.reason === "purchased" ? C.green : C.red, fontWeight: 700 }}>{h.reason === "purchased" ? "✓ Retrait (achat)" : "✕ Retrait (manuel)"}</span>}
                      </td>
                      <td style={{ ...td, color: C.muted, whiteSpace: "nowrap" }}>{fmtDateTime(h.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
