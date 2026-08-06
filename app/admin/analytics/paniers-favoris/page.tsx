"use client";
// app/admin/analytics/paniers-favoris/page.tsx
// Onglet dédié « Paniers & Favoris » — cartes DÉPLACÉES depuis Comportement (pas de
// doublon) + enrichies (filtres/tris sur les paniers, email masqué). Lecture seule.
// Réutilise les routes existantes : abandoned-carts, analytics/cart-adds,
// analytics/wishlist (filtres event_type + created_at côté SQL, agrégation serveur).
import { useState, useMemo } from "react";
import { useAnalyticsData } from "@/components/admin/analytics/useAnalyticsData";
import { Skeleton } from "@/components/admin/analytics/widgets";
import { C } from "@/components/admin/analytics/tokens";
import { SectionTitle, Card } from "@/components/admin/analytics/ui";
import { HBars, BarChart } from "@/components/admin/analytics/charts";
import { periodLabelOf, eur } from "@/components/admin/analytics/period";

type SortKey = "date" | "montant" | "relances" | "statut";
type StatusFilter = "all" | "nouveau" | "en_attente" | "abandonne" | "recupere";

export default function PaniersFavorisPage() {
  const { data, q, narrow, serverError, failedEndpoints } = useAnalyticsData([
    { key: "cartAdds",  path: "/api/admin/analytics/cart-adds" },
    { key: "wishlist",  path: "/api/admin/analytics/wishlist" },
    { key: "abandonedCarts", path: "/api/admin/abandoned-carts", kind: "raw", withQuery: true,
      normalize: (j: any) => (j && Array.isArray(j.carts))
        ? { value: { carts: j.carts, all_time: j.all_time ?? { total: 0, converted: 0 } }, ok: true }
        : { value: { carts: [], all_time: { total: 0, converted: 0 } }, ok: false } },
  ]);
  const cartAdds = data.cartAdds;
  const wishlist = data.wishlist;
  const acLoaded = data.abandonedCarts !== undefined;
  const ac = data.abandonedCarts ?? { carts: [], all_time: { total: 0, converted: 0 } };
  const abandonedCarts: any[] = ac.carts ?? [];
  const allTimeCarts = ac.all_time ?? { total: 0, converted: 0 };
  const periodLabel = periodLabelOf(q);

  const th = { padding: "8px 10px", fontWeight: 700, textAlign: "left" as const };
  const td = { padding: "9px 10px" };

  // Statut dérivé de la DERNIÈRE ACTIVITÉ (updated_at, PAS created_at) :
  //   Nouveau < 1h · En attente 1h→7j · Abandonné > 7j · Récupéré si converti.
  // rank = ordre de tri (nouveau < en attente < abandonné < récupéré).
  const statusOf = (c: any): { key: StatusFilter; label: string; color: string; rank: number } => {
    if (c.converted) return { key: "recupere", label: "Récupéré", color: C.green, rank: 3 };
    const HOUR = 3600_000, DAY = 24 * HOUR;
    const ageMs = Date.now() - new Date(c.updated_at ?? c.created_at).getTime();
    if (ageMs < HOUR)     return { key: "nouveau",    label: "Nouveau",    color: C.blue,  rank: 0 };
    if (ageMs <= 7 * DAY) return { key: "en_attente", label: "En attente", color: C.amber, rank: 1 };
    return { key: "abandonne", label: "Abandonné", color: C.red, rank: 2 };
  };
  const relCount = (c: any) => [c.relance_1, c.relance_2, c.relance_3].filter(Boolean).length;
  const fmtDateTime = (s: string): string => {
    const d = new Date(s);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  const cartsStats = useMemo(() => {
    const total     = abandonedCarts.length;
    const converted = abandonedCarts.filter((c: any) => c.converted).length;
    const recovery  = total > 0 ? (converted / total) * 100 : 0;
    return { total, converted, recovery };
  }, [abandonedCarts]);

  // Filtres / tris (section 1) — c'est ce qui manquait à l'ancienne carte.
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");

  const rows = useMemo(() => {
    let list = abandonedCarts.map((c: any) => ({ c, st: statusOf(c), rel: relCount(c) }));
    if (statusFilter !== "all") list = list.filter(x => x.st.key === statusFilter);
    list.sort((a, b) => {
      if (sortKey === "montant")  return Number(b.c.total ?? 0) - Number(a.c.total ?? 0);
      if (sortKey === "relances") return b.rel - a.rel;
      if (sortKey === "statut")   return a.st.rank - b.st.rank;
      return new Date(b.c.created_at).getTime() - new Date(a.c.created_at).getTime(); // date desc
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abandonedCarts, statusFilter, sortKey]);

  const selStyle = { background: "#0d0b09", color: C.warm, border: `1px solid ${C.faint}`, borderRadius: 8, padding: "7px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" as const, colorScheme: "dark" as const };

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

      {/* Note de lecture : ces indicateurs mesurent des OBJETS différents. */}
      <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: 12, background: "rgba(196,154,74,0.08)", border: `1px solid rgba(196,154,74,0.22)`, fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
        <b style={{ color: C.warm }}>Lecture des compteurs — objets différents, ne pas additionner.</b><br />
        Les « ajouts au panier » comptent des <b style={{ color: C.warm }}>événements</b> (chaque clic). Les « paniers » comptent des <b style={{ color: C.warm }}>entités identifiées</b> (un email saisi = une ligne). Les « récupérés » sont des <b style={{ color: C.warm }}>commandes</b> issues d'un panier sauvegardé. Seuls les paniers avec email saisi sont enregistrés — les paniers anonymes (la majorité) sont invisibles ici.
      </div>

      {/* ══════════════ 1 · PANIERS ══════════════ */}
      <SectionTitle>1 · Paniers · {periodLabel}</SectionTitle>

      {/* Compteurs synthétiques, libellés par unité + référence tout-temps */}
      <div style={{ marginBottom: 16 }}>
        <Card title="🛒 Paniers — synthèse">
          {!acLoaded ? <Skeleton h={80} /> : (
            <>
              <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginBottom: 12 }}>
                <div><div style={{ fontSize: 26, fontWeight: 950, color: C.warm }}>{cartsStats.total}</div><div style={{ fontSize: 11, color: C.muted }}>paniers identifiés · période</div></div>
                <div><div style={{ fontSize: 26, fontWeight: 950, color: C.green }}>{cartsStats.converted}</div><div style={{ fontSize: 11, color: C.muted }}>récupérés · période</div></div>
                <div><div style={{ fontSize: 26, fontWeight: 950, color: C.amber }}>{cartsStats.recovery.toFixed(0)}%</div><div style={{ fontSize: 11, color: C.muted }}>récupération · période</div></div>
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
                Tout-temps : <b style={{ color: C.warm }}>{allTimeCarts.total}</b> paniers identifiés · <b style={{ color: C.green }}>{allTimeCarts.converted}</b> récupérés.
              </div>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
                Un panier n'est enregistré <b>que si un email a été saisi</b> — les paniers anonymes ne sont pas comptés ici. Relance email automatique 1h / 24h / 72h.
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Tableau détaillé + filtres/tris */}
      <div style={{ marginBottom: 24 }}>
        <Card title="🧺 Paniers identifiés de la période">
          {!acLoaded ? <Skeleton h={200} /> : abandonedCarts.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 13, padding: "20px 0", textAlign: "center" }}>Aucun panier sur cette période — essayez une période plus large.</div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: C.muted, display: "flex", alignItems: "center", gap: 6 }}>
                  Statut
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)} style={selStyle}>
                    <option value="all">Tous</option>
                    <option value="nouveau">Nouveau</option>
                    <option value="en_attente">En attente</option>
                    <option value="abandonne">Abandonné</option>
                    <option value="recupere">Récupéré</option>
                  </select>
                </label>
                <label style={{ fontSize: 12, color: C.muted, display: "flex", alignItems: "center", gap: 6 }}>
                  Trier par
                  <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)} style={selStyle}>
                    <option value="date">Date (récent)</option>
                    <option value="montant">Montant (décroissant)</option>
                    <option value="relances">Relances (décroissant)</option>
                    <option value="statut">Statut</option>
                  </select>
                </label>
                <span style={{ fontSize: 12, color: C.muted, marginLeft: "auto" }}>{rows.length} panier(s) affiché(s)</span>
              </div>

              {rows.length === 0 ? (
                <div style={{ color: C.muted, fontSize: 13, padding: "16px 0", textAlign: "center" }}>Aucun panier avec ce statut sur la période.</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead><tr style={{ color: C.muted, textAlign: "left" }}>
                      <th style={th}>Client</th><th style={th}>Statut</th><th style={th}>Montant</th><th style={th}>Contenu</th><th style={th}>Créé</th><th style={th}>Dernière activité</th><th style={th}>Relances</th>
                    </tr></thead>
                    <tbody>
                      {rows.map(({ c, st, rel }) => {
                        const items = Array.isArray(c.items) ? c.items : [];
                        return (
                          <tr key={c.id} style={{ borderTop: `1px solid ${C.faint}`, verticalAlign: "top" }}>
                            <td style={{ ...td, color: C.warm }}>
                              {/* Nom complet du compte (profiles) si dispo, sinon prénom saisi (visiteuse sans compte). */}
                              <div style={{ fontWeight: 800 }}>{c.customer_name || c.prenom || "—"}</div>
                              {/* Email EN CLAIR : back-office privé, sert à recontacter la cliente. */}
                              <div style={{ fontSize: 12, color: "rgba(242,237,230,0.75)", wordBreak: "break-all" }}>{c.email || "—"}</div>
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
                    Statut selon la <b>dernière activité</b> (updated_at) : <b style={{ color: C.blue }}>Nouveau</b> (&lt; 1h), <b style={{ color: C.amber }}>En attente</b> (1h→7j), <b style={{ color: C.red }}>Abandonné</b> (&gt; 7j), <b style={{ color: C.green }}>Récupéré</b> (commande passée). « Dernière activité » = dernière sauvegarde du panier.
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* ══════════════ 2 · AJOUTS AU PANIER ══════════════ */}
      <SectionTitle>2 · Ajouts au panier · {periodLabel}</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <Card title="➕ Ajouts par produit">
          {cartAdds === undefined ? <Skeleton h={160} /> : (cartAdds.by_product ?? []).length === 0 ? (
            <div style={{ color: C.muted, fontSize: 13, padding: "16px 0", textAlign: "center" }}>Aucun ajout au panier sur cette période — essayez une période plus large.</div>
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
          {cartAdds === undefined ? <Skeleton h={160} /> : (cartAdds.by_day ?? []).every((d: any) => !d.count) ? (
            <div style={{ color: C.muted, fontSize: 13, padding: "16px 0", textAlign: "center" }}>Aucun ajout au panier sur cette période — essayez une période plus large.</div>
          ) : (
            <BarChart data={(cartAdds.by_day ?? []).map((d: any) => ({ label: String(d.date).slice(5), value: d.count }))} />
          )}
        </Card>
      </div>

      {/* ══════════════ 3 · FAVORIS ══════════════ */}
      <SectionTitle>3 · Favoris · {periodLabel}</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1.4fr", gap: 16, marginBottom: 24 }}>
        <Card title="❤️ Favoris — synthèse & top produits" lexique="Favoris">
          {wishlist === undefined ? <Skeleton h={160} /> : (
            <>
              <div style={{ display: "flex", gap: 22, flexWrap: "wrap", marginBottom: 10 }}>
                <div><div style={{ fontSize: 22, fontWeight: 950, color: C.amber }}>{wishlist.active ?? 0}</div><div style={{ fontSize: 11, color: C.muted }}>favoris actifs</div></div>
                <div><div style={{ fontSize: 22, fontWeight: 950, color: C.red }}>{wishlist.removed_manual ?? 0}</div><div style={{ fontSize: 11, color: C.muted }}>retirés (abandon)</div></div>
                <div><div style={{ fontSize: 22, fontWeight: 950, color: C.green }}>{wishlist.removed_purchased ?? 0}</div><div style={{ fontSize: 11, color: C.muted }}>retirés (achat) ✓</div></div>
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
                Actifs = ajouts − retraits (tous motifs) sur la période. Donnée <b>non rétroactive</b> (depuis le déploiement du tracking).
              </div>
              {(wishlist.top_products ?? []).length === 0 ? (
                <div style={{ color: C.muted, fontSize: 13 }}>Aucun favori tracké sur la période.</div>
              ) : (
                <HBars data={wishlist.top_products.map((p: any) => ({ label: p.name, value: p.count }))} />
              )}
            </>
          )}
        </Card>
        <Card title="🕒 Historique des mouvements">
          {wishlist === undefined ? <Skeleton h={160} /> : (wishlist.history ?? []).length === 0 ? (
            <div style={{ color: C.muted, fontSize: 13, padding: "16px 0", textAlign: "center" }}>Aucun mouvement de favori sur cette période (donnée non rétroactive — depuis le déploiement du tracking).</div>
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
    </>
  );
}
