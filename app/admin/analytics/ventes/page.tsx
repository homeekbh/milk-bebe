"use client";
// app/admin/analytics/ventes/page.tsx (Lot A4) — ex-section « 3 · Ventes ».
// JSX copié À L'IDENTIQUE. Fetche kpis + conversion + revenue-chart + top-products
// + promos + commandes-data (statuts de livraison, agrégés client-side).
import { useMemo } from "react";
import { useAnalyticsData } from "@/components/admin/analytics/useAnalyticsData";
import { Skeleton } from "@/components/admin/analytics/widgets";
import { C } from "@/components/admin/analytics/tokens";
import { SectionTitle, Card, KpiCard } from "@/components/admin/analytics/ui";
import { LineChart, DonutChart, MiniBar } from "@/components/admin/analytics/charts";
import { eur, ymdToLocal, periodFromMs, weekdayOccurrences, periodLabelOf } from "@/components/admin/analytics/period";

export default function VentesPage() {
  const { data, q, narrow, serverError, failedEndpoints } = useAnalyticsData([
    { key: "kpis",         path: "/api/admin/analytics/kpis" },
    { key: "conversion",   path: "/api/admin/analytics/conversion", withBots: true },
    { key: "revenueChart", path: "/api/admin/analytics/revenue-chart" },
    { key: "topProducts",  path: "/api/admin/analytics/top-products" },
    { key: "promos",       path: "/api/admin/analytics/promos" },
    { key: "slimOrders",   path: "/api/admin/commandes-data?fields=slim", kind: "raw",
      normalize: (j: any) => Array.isArray(j) ? { value: j, ok: true } : { value: [], ok: false } },
  ]);
  const kpis = data.kpis, conversion = data.conversion, revenueChart = data.revenueChart, topProducts = data.topProducts, promos = data.promos;
  const slimOrders: any[] = data.slimOrders ?? [];
  const { mode, period, weekday, wdDepth } = q;
  const dayStr = q.date, rangeFrom = q.from, rangeTo = q.to;
  const showDelta   = mode === "period" ? period !== "all" : true;
  const periodLabel = periodLabelOf(q);

  // ── Statuts livraison (client-side, depuis slim orders filtrés période) ──────
  const shippingDonut = useMemo(() => {
    // Fenêtre alignée sur le sélecteur unique (jour / plage / période glissante).
    let fromMs: number, toMs: number;
    if (mode === "day" && dayStr) {
      const s = ymdToLocal(dayStr).getTime(); fromMs = s; toMs = s + 864e5;
    } else if (mode === "range" && rangeFrom && rangeTo) {
      const a = rangeFrom <= rangeTo ? rangeFrom : rangeTo, b = rangeFrom <= rangeTo ? rangeTo : rangeFrom;
      fromMs = ymdToLocal(a).getTime(); toMs = ymdToLocal(b).getTime() + 864e5;
    } else if (mode === "weekday") {
      const occ = weekdayOccurrences(weekday, wdDepth);
      fromMs = occ.length ? ymdToLocal(occ[0]).getTime() : periodFromMs(period);
      toMs   = occ.length ? ymdToLocal(occ[occ.length - 1]).getTime() + 864e5 : Date.now();
    } else {
      fromMs = periodFromMs(period); toMs = Date.now();
    }
    const PAY_EXCL = ["annulee", "remboursee", "echec_paiement"];
    const counts: Record<string, number> = {};
    slimOrders
      .filter(o => { const t = new Date(o.created_at).getTime(); return t >= fromMs && t < toMs; })
      .forEach(o => {
        const s = String(o.status ?? "").toLowerCase();
        if (PAY_EXCL.includes(s)) return;
        const sh = String(o.shipping_status ?? "").toLowerCase() || "en_preparation";
        counts[sh] = (counts[sh] ?? 0) + 1;
      });
    const MAP: Record<string, { label: string; color: string }> = {
      en_preparation: { label: "En préparation", color: C.amber },
      label_created:  { label: "Étiquette créée", color: C.blue },
      expediee:       { label: "Expédiée",        color: C.blue },
      livree:         { label: "Livrée",          color: C.green },
      retour:         { label: "Retour",          color: C.red },
    };
    return Object.entries(counts)
      .map(([k, v]) => ({ label: MAP[k]?.label ?? k, value: v, color: MAP[k]?.color ?? C.purple }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [slimOrders, period, mode, dayStr, rangeFrom, rangeTo, weekday, wdDepth]);

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

      {/* ══════════════ 3 · VENTES ══════════════ */}
      <SectionTitle>3 · Ventes</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
        {kpis ? (
          <>
            <KpiCard label="Chiffre d'affaires" value={eur(kpis.revenue)}        color={C.amber} delta={showDelta ? kpis.revenue_delta_pct : undefined} />
            <KpiCard label="Panier moyen"        value={eur(kpis.avg_basket, 2)}  delta={showDelta ? kpis.basket_delta_pct : undefined} />
            <KpiCard label="Taux de conversion"  value={conversion ? `${conversion.conversion_rate.toFixed(2)}%` : "—"} sub={conversion ? `${conversion.purchases} vente(s) / ${conversion.sessions} session(s)` : ""} color={C.green} delta={showDelta ? conversion?.conversion_delta_pct ?? undefined : undefined} />
          </>
        ) : <><Skeleton h={110} /><Skeleton h={110} /><Skeleton h={110} /></>}
      </div>

      {/* CA par jour (courbe) */}
      <div style={{ marginBottom: 24 }}>
        <Card title={`📈 Chiffre d'affaires ${periodLabel}`} lexique="CA par jour">
          {revenueChart ? <LineChart data={(revenueChart.points ?? []).map((p: any) => ({ label: p.label, value: p.revenue }))} color={C.amber} /> : <Skeleton h={150} />}
        </Card>
      </div>

      {/* Top produits + Statuts de livraison */}
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1.3fr 1fr", gap: 16, marginBottom: 24 }}>
        <Card title="🏆 Top produits" lexique="Top produits">
          {!topProducts ? <Skeleton h={150} /> : (topProducts.products ?? []).length === 0 ? (
            <div style={{ color: C.muted, fontSize: 13 }}>Aucune vente sur la période.</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {topProducts.products.map((p: any, i: number) => (
                <div key={p.id + i}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontSize: 13, color: C.warm, fontWeight: 700 }}>{i + 1}. {p.name}</span>
                    <span style={{ fontSize: 13, color: C.amber, fontWeight: 800, whiteSpace: "nowrap" }}>{eur(p.revenue)} · {p.quantity_sold}×</span>
                  </div>
                  <MiniBar value={p.revenue} max={topProducts.products[0]?.revenue ?? 1} />
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="🚚 Statuts de livraison" lexique="Statuts livraison">
          <DonutChart data={shippingDonut} />
        </Card>
      </div>

      {/* Performance des codes promo */}
      <div style={{ marginBottom: 24 }}>
        <Card title="🏷️ Performance des codes promo" lexique="Codes promos">
          {!promos ? <Skeleton h={120} /> : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div style={{ padding: 14, borderRadius: 12, background: "rgba(196,154,74,0.06)", border: `1px solid ${C.faint}` }}>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>AVEC PROMO</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: C.amber }}>{eur(promos.with_promo?.revenue)}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{promos.with_promo?.count ?? 0} commande(s)</div>
                </div>
                <div style={{ padding: 14, borderRadius: 12, background: "rgba(242,237,230,0.04)", border: `1px solid ${C.faint}` }}>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>SANS PROMO</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: C.warm }}>{eur(promos.without_promo?.revenue)}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{promos.without_promo?.count ?? 0} commande(s)</div>
                </div>
              </div>
              {(promos.promos ?? []).length === 0 ? (
                <div style={{ color: C.muted, fontSize: 13 }}>Aucun code promo utilisé sur la période.</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ color: C.muted, textAlign: "left" }}>
                        <th style={{ padding: "8px 10px", fontWeight: 700 }}>Code</th>
                        <th style={{ padding: "8px 10px", fontWeight: 700 }}>Utilisations</th>
                        <th style={{ padding: "8px 10px", fontWeight: 700 }}>CA généré</th>
                        <th style={{ padding: "8px 10px", fontWeight: 700 }}>Panier moyen</th>
                        <th style={{ padding: "8px 10px", fontWeight: 700 }}>Remises</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promos.promos.map((p: any) => (
                        <tr key={p.code} style={{ borderTop: `1px solid ${C.faint}` }}>
                          <td style={{ padding: "10px 10px", color: C.warm, fontWeight: 800 }}>{p.code}</td>
                          <td style={{ padding: "10px 10px", color: C.muted }}>{p.uses_count}</td>
                          <td style={{ padding: "10px 10px", color: C.amber, fontWeight: 800 }}>{eur(p.revenue)}</td>
                          <td style={{ padding: "10px 10px", color: C.muted }}>{eur(p.avg_basket, 2)}</td>
                          <td style={{ padding: "10px 10px", color: C.red }}>−{eur(p.discount_total, 2)}</td>
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
    </>
  );
}
