"use client";
// app/admin/analytics/operationnel/page.tsx (Lot A4) — ex-section « 5 · Opérationnel ».
// JSX copié À L'IDENTIQUE. Fetche stock-dormant + stock-alerts + geo.
import { useMemo } from "react";
import { useAnalyticsData } from "@/components/admin/analytics/useAnalyticsData";
import { Skeleton } from "@/components/admin/analytics/widgets";
import { C } from "@/components/admin/analytics/tokens";
import { SectionTitle, Card } from "@/components/admin/analytics/ui";
import { MiniBar } from "@/components/admin/analytics/charts";
import { eur } from "@/components/admin/analytics/period";

export default function OperationnelPage() {
  const { data, q, narrow, serverError, failedEndpoints } = useAnalyticsData([
    { key: "stockDormant", path: "/api/admin/analytics/stock-dormant", withQuery: false },
    { key: "geo",          path: "/api/admin/analytics/geo" },
    { key: "stockAlerts",  path: "/api/admin/stock-alerts", kind: "raw",
      normalize: (j: any) => Array.isArray(j) ? { value: j, ok: true } : (j?.data && Array.isArray(j.data)) ? { value: j.data, ok: true } : { value: [], ok: false } },
  ]);
  const stockDormant = data.stockDormant, geo = data.geo;
  const stockAlerts: any[] = data.stockAlerts ?? [];
  const mode = q.mode;

  // ── Réassort : top produits demandés (client-side) ──────────────────────────
  const topAlerts = useMemo(() => {
    const map: Record<string, number> = {};
    stockAlerts.forEach((a: any) => {
      const name = a.product_name ?? a.name ?? "Produit";
      map[name] = (map[name] ?? 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [stockAlerts]);

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

      {/* ══════════════ 5 · OPÉRATIONNEL ══════════════ */}
      <SectionTitle>5 · Opérationnel</SectionTitle>

      {/* Stock dormant + Réassort demandé */}
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <Card title="📦 Stock dormant (aucune vente depuis 30j)" lexique="Stock dormant">
          {mode !== "period" && (
            <div style={{ marginBottom: 10, fontSize: 11, color: C.amber, fontWeight: 700, lineHeight: 1.5 }}>
              ⏳ Toujours calculé sur les 30 derniers jours (glissant) — indépendant de la période calendaire sélectionnée ci-dessus.
            </div>
          )}
          {!stockDormant ? <Skeleton h={120} /> : (stockDormant.products ?? []).length === 0 ? (
            <div style={{ color: C.muted, fontSize: 13 }}>Aucun produit dormant 🎉</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {stockDormant.products.slice(0, 12).map((p: any) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, borderTop: `1px solid ${C.faint}`, paddingTop: 8 }}>
                  <span style={{ fontSize: 13, color: C.warm }}>{p.name}</span>
                  <span style={{ fontSize: 12, color: C.muted, whiteSpace: "nowrap" }}>
                    stock {p.stock} · {p.days_dormant === null ? "jamais vendu" : `${p.days_dormant}j`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="🔔 Réassort demandé" lexique="Alertes réassort">
          {topAlerts.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 13 }}>Aucune demande de réassort.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {topAlerts.map((a, i) => (
                <div key={a.name + i} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: C.warm }}>{a.name}</span>
                  <span style={{ fontSize: 13, color: C.amber, fontWeight: 800 }}>{a.count} demande(s)</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Top villes par chiffre d'affaires (commandes) */}
      <div style={{ marginBottom: 24 }}>
        <Card title="🗺️ Top villes (chiffre d'affaires)" lexique="Top villes">
          {!geo ? <Skeleton h={120} /> : (geo.cities ?? []).length === 0 ? (
            <div style={{ color: C.muted, fontSize: 13 }}>Aucune donnée géographique.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {geo.cities.map((v: any, i: number) => (
                <div key={v.city + i}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, color: C.warm }}>{v.city}</span>
                    <span style={{ fontSize: 12, color: C.amber, fontWeight: 800 }}>{eur(v.revenue)} · {v.orders_count} cmd</span>
                  </div>
                  <MiniBar value={v.revenue} max={geo.cities[0]?.revenue ?? 1} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
