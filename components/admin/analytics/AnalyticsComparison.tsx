"use client";
// components/admin/analytics/AnalyticsComparison.tsx (Lot A8.3)
// Bloc « Évolution comparée » réutilisable par les onglets (même composant et même
// mise en forme que la Vue d'ensemble : ComparisonChart importé tel quel). Fetch
// autonome de /api/admin/analytics/series pour les métriques passées en prop.
// Titre du bloc + libellés de légende issus de periodLabelOf / compareRangeOf
// (aucun texte de période en dur). Masqué en mode weekday (comme la Vue d'ensemble).
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { C } from "@/components/admin/analytics/tokens";
import { Card } from "@/components/admin/analytics/ui";
import { Skeleton } from "@/components/admin/analytics/widgets";
import ComparisonChart, { type MetricKey } from "@/components/admin/analytics/ComparisonChart";
import { adminFetch } from "@/components/admin/analytics/useAnalyticsData";
import { useAnalyticsRefresh } from "@/components/admin/analytics/refresh-context";
import { parseQuery, granularityOf, compareRangeOf, periodLabelOf } from "@/components/admin/analytics/period";

export default function AnalyticsComparison({ metrics }: { metrics: { key: MetricKey; label: string }[] }) {
  const sp = useSearchParams();
  const q = parseQuery(new URLSearchParams(sp.toString()));
  const { refreshNonce } = useAnalyticsRefresh();
  const wk  = q.mode === "weekday";
  const g   = granularityOf(q.from, q.to);
  const cmp = compareRangeOf(q.preset, q.from, q.to, q.compare === "wd");
  const periodLabel = periodLabelOf(q);
  const mParam = metrics.map(m => m.key).join(",");

  const [metric, setMetric] = useState<MetricKey>(metrics[0].key);
  const [series, setSeries] = useState<any>(null);

  useEffect(() => {
    if (wk || !q.from || !q.to) { setSeries(null); return; }
    let cancelled = false;
    const url = `/api/admin/analytics/series?from=${q.from}&to=${q.to}&cfrom=${cmp.cfrom}&cto=${cmp.cto}&g=${g}&bots=${q.bots ? "exclude" : "all"}&m=${mParam}`;
    (async () => {
      try { const r = await adminFetch(url); const j = await r.json(); if (!cancelled) setSeries(j?.error ? null : (j.data ?? null)); }
      catch { if (!cancelled) setSeries(null); }
    })();
    return () => { cancelled = true; };
  }, [wk, q.from, q.to, cmp.cfrom, cmp.cto, g, q.bots, mParam, refreshNonce]);

  if (wk) return null; // pas de courbe comparative en mode weekday

  return (
    <div style={{ marginBottom: 24 }}>
      <Card title="📊 Évolution comparée">
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          {metrics.map(mo => {
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
            metric={metric} label={metrics.find(m => m.key === metric)!.label} currentLabel={periodLabel} compareLabel={cmp.label} />
        )}
      </Card>
    </div>
  );
}
