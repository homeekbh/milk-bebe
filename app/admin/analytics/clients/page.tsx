"use client";
// app/admin/analytics/clients/page.tsx (Lot A4) — ex-section « 4 · Clients & fidélité ».
// JSX copié À L'IDENTIQUE. Fetche accounts-count + kpis + retention + top-customers
// + newsletter + reviews.
import { useMemo } from "react";
import { useAnalyticsData } from "@/components/admin/analytics/useAnalyticsData";
import AnalyticsComparison from "@/components/admin/analytics/AnalyticsComparison";
import { Skeleton } from "@/components/admin/analytics/widgets";
import { C } from "@/components/admin/analytics/tokens";
import { SectionTitle, Card, KpiCard } from "@/components/admin/analytics/ui";
import { LineChart, MiniBar } from "@/components/admin/analytics/charts";
import { eur, comparisonLabelOf } from "@/components/admin/analytics/period";

export default function ClientsPage() {
  const { data, q, narrow, serverError, failedEndpoints } = useAnalyticsData([
    { key: "accounts",     path: "/api/admin/analytics/accounts-count" },
    { key: "kpis",         path: "/api/admin/analytics/kpis" },
    { key: "retention",    path: "/api/admin/analytics/retention" },
    { key: "topCustomers", path: "/api/admin/analytics/top-customers" },
    { key: "newsletter",   path: "/api/admin/newsletter", kind: "raw",
      normalize: (j: any) => (j?.subscribers && Array.isArray(j.subscribers)) ? { value: j.subscribers, ok: true } : Array.isArray(j) ? { value: j, ok: true } : { value: [], ok: false } },
    { key: "reviews",      path: "/api/admin/reviews", kind: "raw",
      normalize: (j: any) => Array.isArray(j) ? { value: j, ok: true } : { value: [], ok: false } },
  ]);
  const accounts = data.accounts, kpis = data.kpis, retention = data.retention, topCustomers = data.topCustomers;
  const newsletter: any[] = data.newsletter ?? [];
  const reviews: any[] = data.reviews ?? [];
  const showDelta = q.mode === "period" ? q.period !== "all" : true;
  const cmpLabel  = comparisonLabelOf(q); // base de comparaison UNIQUE de la page (défaut #6)

  // ── Newsletter par mois (client-side) ───────────────────────────────────────
  const newsletterByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    newsletter.forEach((n: any) => {
      if (!n.created_at) return;
      const key = new Date(n.created_at).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      map[key] = (map[key] ?? 0) + 1;
    });
    return Object.entries(map).map(([label, value]) => ({ label, value }));
  }, [newsletter]);
  const newsletterTotal = newsletter.length;
  const newsletterDesab = newsletter.filter((n: any) => n.active === false).length;

  // ── Avis (client-side, avis notés uniquement) ───────────────────────────────
  const ratedReviews = reviews.filter((r: any) => typeof r.rating === "number" && r.rating > 0);
  const avgRating = ratedReviews.length > 0
    ? (ratedReviews.reduce((s: number, r: any) => s + r.rating, 0) / ratedReviews.length).toFixed(1)
    : null;
  const ratingDistrib = [5, 4, 3, 2, 1].map(star => ({
    label: `${star}★`,
    value: ratedReviews.filter((r: any) => r.rating === star).length,
    color: star >= 4 ? C.green : star === 3 ? C.amber : C.red,
  }));

  return (
    <>
      <AnalyticsComparison metrics={[{ key: "new_accounts", label: "Comptes créés" }, { key: "newsletter", label: "Inscrits newsletter" }]} />
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

      {/* ══════════════ 4 · CLIENTS & FIDÉLITÉ ══════════════ */}
      <SectionTitle>4 · Clients &amp; fidélité</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
        {/* Toujours rendue (jamais gated sur `accounts`) → ne peut plus « disparaître »
            en skeleton perpétuel si la route est lente/échoue ; le sous-titre affiche le
            TOTAL all-time même quand le compte de la période vaut 0. */}
        <KpiCard label="Comptes créés" value={String(accounts?.count ?? 0)}
          sub={accounts ? `${accounts.total ?? 0} compte(s) au total` : "inscriptions sur la période"}
          color={C.blue} delta={showDelta ? accounts?.delta_pct : undefined} deltaLabel={cmpLabel}
          href="/admin/comptes" actionLabel="Voir les comptes →" />
        {kpis
          ? <KpiCard label="Clients uniques" value={String(kpis.unique_customers)} sub={`${kpis.orders_count} commande(s)`} delta={showDelta ? kpis.orders_delta_pct : undefined} deltaLabel={cmpLabel} />
          : <Skeleton h={110} />}
        {retention ? (
          <>
            <KpiCard label="Nouveaux clients"  value={String(retention.new_customers)}       sub="1re commande sur la période" color={C.purple} />
            <KpiCard label="Clients fidèles"   value={String(retention.returning_customers)} sub="avaient déjà commandé avant" />
            <KpiCard label="Taux de fidélité"  value={`${retention.loyalty_rate.toFixed(0)}%`} color={C.green} />
          </>
        ) : <><Skeleton h={110} /><Skeleton h={110} /><Skeleton h={110} /></>}
      </div>

      {/* Top clients */}
      <div style={{ marginBottom: 24 }}>
        <Card title="👑 Top clients" lexique="Top clients">
          {!topCustomers ? <Skeleton h={120} /> : (topCustomers.customers ?? []).length === 0 ? (
            <div style={{ color: C.muted, fontSize: 13 }}>Aucun client sur la période.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ color: C.muted, textAlign: "left" }}>
                    <th style={{ padding: "8px 10px", fontWeight: 700 }}>Client</th>
                    <th style={{ padding: "8px 10px", fontWeight: 700 }}>Commandes</th>
                    <th style={{ padding: "8px 10px", fontWeight: 700 }}>CA</th>
                    <th style={{ padding: "8px 10px", fontWeight: 700 }}>Dernière</th>
                  </tr>
                </thead>
                <tbody>
                  {topCustomers.customers.map((c: any, i: number) => (
                    <tr key={c.email + i} style={{ borderTop: `1px solid ${C.faint}` }}>
                      <td style={{ padding: "10px 10px", color: C.warm }}>
                        <div style={{ fontWeight: 700 }}>{c.name || "—"}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{c.email}</div>
                      </td>
                      <td style={{ padding: "10px 10px", color: C.muted }}>{c.orders_count}</td>
                      <td style={{ padding: "10px 10px", color: C.amber, fontWeight: 800 }}>{eur(c.total_revenue)}</td>
                      <td style={{ padding: "10px 10px", color: C.muted }}>{new Date(c.last_order_at).toLocaleDateString("fr-FR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Newsletter + Avis clients */}
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <Card title="📧 Newsletter" lexique="Newsletter">
          <div style={{ display: "flex", gap: 20, marginBottom: 12 }}>
            <div><div style={{ fontSize: 22, fontWeight: 950, color: C.amber }}>{newsletterTotal}</div><div style={{ fontSize: 11, color: C.muted }}>inscrits</div></div>
            <div><div style={{ fontSize: 22, fontWeight: 950, color: C.red }}>{newsletterDesab}</div><div style={{ fontSize: 11, color: C.muted }}>désabonnés</div></div>
          </div>
          {newsletterByMonth.length > 0 ? <LineChart data={newsletterByMonth} color={C.amber} height={140} /> : <div style={{ color: C.muted, fontSize: 13 }}>Pas encore d'inscrits.</div>}
        </Card>
        <Card title="⭐ Avis clients" lexique="Note moyenne">
          {avgRating ? (
            <>
              <div style={{ fontSize: 30, fontWeight: 950, color: C.amber, marginBottom: 4 }}>{avgRating}<span style={{ fontSize: 16, color: C.muted }}> / 5</span></div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>{ratedReviews.length} avis noté(s)</div>
              <div style={{ display: "grid", gap: 6 }}>
                {ratingDistrib.map(r => (
                  <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: C.muted, width: 28 }}>{r.label}</span>
                    <div style={{ flex: 1 }}><MiniBar value={r.value} max={Math.max(...ratingDistrib.map(x => x.value), 1)} color={r.color} /></div>
                    <span style={{ fontSize: 12, color: C.muted, width: 20, textAlign: "right" }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div style={{ color: C.muted, fontSize: 13 }}>Aucun avis noté pour l'instant.</div>}
        </Card>
      </div>
    </>
  );
}
