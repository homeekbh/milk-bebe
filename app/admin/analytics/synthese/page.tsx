"use client";
// app/admin/analytics/synthese/page.tsx (Lot Synthèse) — 7e onglet.
// UNE vue : un seul très grand graphique multi-séries (double axe) regroupant toutes
// les métriques du site sur la période. Réutilise la route /series (déjà toutes les
// métriques à granularité horaire + filtre bots + période) — aucune nouvelle route API.
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useIsNarrow } from "@/lib/useIsNarrow";
import { C } from "@/components/admin/analytics/tokens";
import { Card } from "@/components/admin/analytics/ui";
import { Skeleton } from "@/components/admin/analytics/widgets";
import { adminFetch } from "@/components/admin/analytics/useAnalyticsData";
import { useAnalyticsRefresh } from "@/components/admin/analytics/refresh-context";
import { parseQuery, granularityOf, compareRangeOf, periodLabelOf } from "@/components/admin/analytics/period";
import MultiSeriesChart, { type SeriesDef } from "@/components/admin/analytics/MultiSeriesChart";

// Les 8 séries listées au lot, TOUTES vérifiées disponibles en base (horodatage horaire) et
// exposées par /series. Couleurs vérifiées WCAG ≥ 3:1 sur le fond #161210 du graphe.
//   Axe GAUCHE (volume, barres) : vues / sessions / visiteurs.
//   Axe DROIT (événements rares, courbes) : ajouts panier / checkouts / ventes / CA / newsletter.
const SERIES: SeriesDef[] = [
  { key: "views",          label: "Vues",          axis: "left",  color: "#3b82f6" },
  { key: "sessions",       label: "Sessions",      axis: "left",  color: "#a855f7" },
  { key: "visitors",       label: "Visiteurs",     axis: "left",  color: "#94a3b8" },
  { key: "add_to_cart",    label: "Ajouts panier", axis: "right", color: "#c49a4a" },
  { key: "begin_checkout", label: "Checkouts",     axis: "right", color: "#fb923c" },
  { key: "orders",         label: "Ventes",        axis: "right", color: "#22c55e" },
  { key: "revenue",        label: "CA",            axis: "right", color: "#f472b6", unit: "€" },
  { key: "newsletter",     label: "Newsletter",    axis: "right", color: "#2dd4bf" },
];
const METRICS = SERIES.map(s => s.key).join(",");

export default function SynthesePage() {
  const sp = useSearchParams();
  const q  = parseQuery(new URLSearchParams(sp.toString()));
  const narrow = useIsNarrow();
  const { refreshNonce } = useAnalyticsRefresh();

  const g   = granularityOf(q.from, q.to);
  const cmp = compareRangeOf(q.preset, q.from, q.to, q.compare === "wd"); // requis par /series (compare ignoré ici)
  const periodLabel = periodLabelOf(q);

  const [data, setData] = useState<any>(null);
  const [err,  setErr]  = useState<string | null>(null);

  useEffect(() => {
    if (!q.from || !q.to) { setData(null); return; }
    let cancelled = false;
    setData(null); setErr(null);
    const url = `/api/admin/analytics/series?from=${q.from}&to=${q.to}&cfrom=${cmp.cfrom}&cto=${cmp.cto}&g=${g}&bots=${q.bots ? "exclude" : "all"}&m=${METRICS}`;
    (async () => {
      try {
        const r = await adminFetch(url);
        const j = await r.json();
        if (!cancelled) { if (j?.error) setErr(String(j.error)); else setData(j.data ?? null); }
      } catch { if (!cancelled) setErr("Erreur réseau."); }
    })();
    return () => { cancelled = true; };
  }, [q.from, q.to, cmp.cfrom, cmp.cto, g, q.bots, refreshNonce]);

  const grainLabel = g === "hour" ? "heure" : g === "week" ? "semaine" : "jour";

  return (
    <div style={{ marginBottom: 24 }}>
      <Card title={`📊 Synthèse — toutes les métriques (${periodLabel})`}>
        {err ? (
          <div style={{ padding: "14px 20px", borderRadius: 12, background: "rgba(239,68,68,0.12)", border: `1px solid rgba(239,68,68,0.45)`, color: C.red, fontSize: 14, fontWeight: 800 }}>
            ⛔ {err}
          </div>
        ) : !data ? (
          <Skeleton h={340} />
        ) : (
          <MultiSeriesChart points={data.points ?? []} granularity={data.granularity ?? g} series={SERIES} narrow={narrow} />
        )}
        <div style={{ fontSize: 11, color: C.muted, marginTop: 10, lineHeight: 1.6 }}>
          Une barre / un point par {grainLabel}. « Ventes » et « CA » = commandes <b>clientes web</b> (hors sorties manuelles, cadeaux, collabs). Filtre bots et période partagés avec les six autres onglets ; clique une entrée de légende pour l'isoler.
        </div>
      </Card>
    </div>
  );
}
