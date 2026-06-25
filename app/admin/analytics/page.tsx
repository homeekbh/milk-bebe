"use client";
import { useIsNarrow } from "@/lib/useIsNarrow";

// Helper inline — lit le token Supabase depuis localStorage
function adminFetch(url: string, options: RequestInit = {}) {
  let token = "";
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) ?? "";
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const parsed = JSON.parse(localStorage.getItem(key) ?? "{}");
        token = parsed.access_token ?? "";
        if (token) break;
      }
    }
  } catch {}
  return fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers ?? {}) },
  });
}

import { useEffect, useState, useMemo, useCallback } from "react";

type PeriodKey = "7" | "30" | "90" | "all";

const C = {
  bg: "#0d0b09", bg2: "#161210", card: "#1c1814",
  amber: "#c49a4a", warm: "#f2ede6",
  muted: "rgba(242,237,230,0.45)", faint: "rgba(242,237,230,0.08)",
  green: "#22c55e", red: "#ef4444", blue: "#3b82f6", purple: "#a855f7",
};

// ─── Lexique ──────────────────────────────────────────────────────────────────
const LEXIQUE: Record<string, { icon: string; def: string }> = {
  "Chiffre d'affaires":    { icon: "💶", def: "Total des ventes encaissées sur la période. Inclut les commandes payées, en préparation, expédiées et livrées. Exclut annulations et remboursements." },
  "Panier moyen":          { icon: "🛒", def: "Montant moyen dépensé par commande. Formule : CA ÷ nb commandes. Plus il est élevé, mieux c'est." },
  "Taux de conversion":    { icon: "🎯", def: "% de sessions qui aboutissent à une commande, sur la MÊME période. La moyenne e-commerce est 1–3%." },
  "Clients uniques":       { icon: "👤", def: "Nombre d'adresses email distinctes ayant commandé sur la période. Un client qui commande 2× compte pour 1." },
  "Taux de fidélité":      { icon: "🔁", def: "% de clients actifs sur la période qui avaient déjà commandé avant. Un client fidèle coûte 5× moins cher à garder qu'à acquérir." },
  "Nouveaux clients":      { icon: "✨", def: "Clients dont la toute première commande tombe dans la période sélectionnée. Mesure l'acquisition." },
  "Codes promos":          { icon: "🏷️", def: "Performance des codes promo : utilisations, CA généré et remises accordées. Mesure l'efficacité des campagnes." },
  "Top produits":          { icon: "🏆", def: "Classement par CA généré sur la période. Le #1 est votre best-seller — mettez-le en avant." },
  "CA par jour":           { icon: "📈", def: "Évolution du CA dans le temps. Les pics correspondent souvent à une story Instagram ou une campagne email." },
  "Statuts livraison":     { icon: "🚚", def: "Répartition des commandes de la période par état : préparation, expédiée, livrée, retour." },
  "Note moyenne":          { icon: "⭐", def: "Moyenne des étoiles sur 5 (avis notés uniquement). En dessous de 4/5, il faut investiguer." },
  "Top clients":           { icon: "👑", def: "Vos meilleurs acheteurs de la période classés par CA généré. À choyer avec un programme de fidélité." },
  "Top villes":            { icon: "🗺️", def: "Villes d'où viennent vos commandes. Utile pour cibler la publicité locale." },
  "Paniers abandonnés":    { icon: "🛒", def: "Visiteurs ayant mis des articles au panier sans payer. Le tracker envoie 3 emails de relance (1h, 24h, 72h)." },
  "Stock dormant":         { icon: "📦", def: "Produits avec du stock mais aucune vente depuis 30 jours. Capital immobilisé — candidats à une promo ou une story dédiée." },
  "Newsletter":            { icon: "📧", def: "Inscrits à votre liste email. Votre actif marketing le plus précieux — indépendant des algorithmes." },
  "Alertes réassort":      { icon: "🔔", def: "Clients ayant demandé à être alertés quand un produit épuisé revient. Indicateur fort d'intérêt produit." },
};

// ─── Composants ───────────────────────────────────────────────────────────────
function LexiqueTag({ terme }: { terme: string }) {
  const [open, setOpen] = useState(false);
  const entry = LEXIQUE[terme];
  if (!entry) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, padding: 0 }}>
        <div style={{ width: 16, height: 16, borderRadius: "50%", border: `1px solid rgba(196,154,74,0.4)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: C.amber, fontWeight: 900, flexShrink: 0 }}>?</div>
        <span style={{ fontSize: 11, color: C.amber, fontWeight: 700 }}>{open ? "Fermer" : "C'est quoi ?"}</span>
      </button>
      {open && (
        <div style={{ marginTop: 6, padding: "8px 12px", borderRadius: 8, background: "rgba(196,154,74,0.08)", border: "1px solid rgba(196,154,74,0.15)", fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
          {entry.icon} {entry.def}
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub, color = C.warm, delta, deltaLabel = "vs période préc." }: {
  label: string; value: string; sub?: string; color?: string; delta?: number; deltaLabel?: string;
}) {
  return (
    <div style={{ background: C.card, borderRadius: 16, padding: "22px 20px", border: `1px solid ${C.faint}` }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" as const, color: C.muted, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: "clamp(22px,2.5vw,32px)", fontWeight: 950, letterSpacing: -1, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{sub}</div>}
      {delta !== undefined && (
        <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6, color: delta >= 0 ? C.green : C.red }}>
          {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}% {deltaLabel}
        </div>
      )}
      <LexiqueTag terme={label} />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase" as const, color: C.amber, marginBottom: 16, marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 1, background: "rgba(196,154,74,0.15)" }} />
      {children}
      <div style={{ flex: 1, height: 1, background: "rgba(196,154,74,0.15)" }} />
    </div>
  );
}

function Card({ children, title, lexique }: { children: React.ReactNode; title: string; lexique?: string }) {
  return (
    <div style={{ background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.faint}` }}>
      <div style={{ fontSize: 14, fontWeight: 900, color: C.warm, marginBottom: 16 }}>{title}</div>
      {children}
      {lexique && <LexiqueTag terme={lexique} />}
    </div>
  );
}

function BarChart({ data, height = 150 }: { data: { label: string; value: number }[]; height?: number }) {
  if (!data.length) return <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 30 }}>Aucune donnée</div>;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 600 ${height + 30}`} style={{ width: "100%", minWidth: 280 }}>
        {[0.25, 0.5, 0.75, 1].map(t => (
          <line key={t} x1={20} x2={590} y1={height - height * t} y2={height - height * t} stroke={C.faint} strokeWidth={1} />
        ))}
        {data.map((d, i) => {
          const w = Math.max(4, (560 / data.length) - 4);
          const gap = (560 - w * data.length) / (data.length + 1);
          const x = 20 + gap + i * (w + gap);
          const h = (d.value / max) * height;
          return (
            <g key={i}>
              <rect x={x} y={height - h} width={w} height={h} rx={3} fill={C.amber} opacity={0.85} />
              {(data.length <= 14 || i % Math.ceil(data.length / 14) === 0) && (
                <text x={x + w / 2} y={height + 20} fill={C.muted} fontSize={9} textAnchor="middle" fontFamily="system-ui">{d.label}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function MiniBar({ value, max, color = C.amber }: { value: number; max: number; color?: string }) {
  return (
    <div style={{ height: 4, background: C.faint, borderRadius: 99, marginTop: 6 }}>
      <div style={{ height: "100%", width: `${Math.min(100, (value / Math.max(max, 1)) * 100)}%`, background: color, borderRadius: 99, transition: "width 0.5s ease" }} />
    </div>
  );
}

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <div style={{ color: C.muted, fontSize: 13, padding: "16px 0" }}>Aucune donnée</div>;
  const r = 55; const cx = 75; const cy = 75; let offset = -Math.PI / 2;
  const slices = data.map(d => {
    const angle = (d.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(offset), y1 = cy + r * Math.sin(offset);
    const x2 = cx + r * Math.cos(offset + angle), y2 = cy + r * Math.sin(offset + angle);
    const s = { ...d, path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${angle > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z` };
    offset += angle; return s;
  });
  return (
    <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
      <svg viewBox="0 0 150 150" style={{ width: 100, flexShrink: 0 }}>
        {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} opacity={0.85} />)}
        <circle cx={cx} cy={cy} r={34} fill={C.card} />
        <text x={cx} y={cy + 4} fill={C.warm} fontSize={10} textAnchor="middle" fontFamily="system-ui" fontWeight="bold">{total}</text>
      </svg>
      <div style={{ display: "grid", gap: 7, flex: 1 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: C.muted, flex: 1 }}>{s.label}</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: C.warm }}>{((s.value / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Skeleton({ h = 80 }: { h?: number }) {
  return <div style={{ height: h, borderRadius: 12, background: "rgba(242,237,230,0.04)", border: `1px solid ${C.faint}`, display: "grid", placeItems: "center", color: C.muted, fontSize: 12 }}>Chargement…</div>;
}

// ─── Helpers format ───────────────────────────────────────────────────────────
const eur  = (n: any, dec = 0) => `${(Number(n) || 0).toLocaleString("fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec })} €`;
const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "7", label: "7j" }, { key: "30", label: "30j" }, { key: "90", label: "90j" }, { key: "all", label: "Tout" },
];
function periodFromMs(p: PeriodKey): number {
  if (p === "all") return new Date("2024-01-01").getTime();
  const days = p === "7" ? 7 : p === "30" ? 30 : 90;
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function AdminStats() {
  const narrow = useIsNarrow();

  const [period, setPeriod] = useState<PeriodKey>("30");

  // Données server-side (chacune null tant que non chargée)
  const [kpis,         setKpis]         = useState<any>(null);
  const [revenueChart, setRevenueChart] = useState<any>(null);
  const [topProducts,  setTopProducts]  = useState<any>(null);
  const [topCustomers, setTopCustomers] = useState<any>(null);
  const [conversion,   setConversion]   = useState<any>(null);
  const [promos,       setPromos]       = useState<any>(null);
  const [retention,    setRetention]    = useState<any>(null);
  const [geo,          setGeo]          = useState<any>(null);
  const [stockDormant, setStockDormant] = useState<any>(null);

  // Données client-side conservées
  const [slimOrders,     setSlimOrders]     = useState<any[]>([]);
  const [abandonedCarts, setAbandonedCarts] = useState<any[]>([]);
  const [newsletter,     setNewsletter]     = useState<any[]>([]);
  const [reviews,        setReviews]        = useState<any[]>([]);
  const [stockAlerts,    setStockAlerts]    = useState<any[]>([]);

  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [partialData, setPartialData] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    let anyError = false;

    // safe() : renvoie le JSON parsé ou null, et lève le flag d'erreur.
    const safe = async (url: string): Promise<any> => {
      try {
        const r = await adminFetch(url);
        if (!r.ok) { anyError = true; return null; }
        return await r.json();
      } catch { anyError = true; return null; }
    };
    // Route analytics standardisée { data, error }
    const safeData = async (url: string): Promise<any> => {
      const j = await safe(url);
      if (!j || j.error) { anyError = true; return null; }
      return j.data ?? null;
    };

    const q = `?period=${period}`;
    try {
      const [
        kpisD, revD, topPD, topCD, convD, promoD, retD, geoD, dormantD,
        slim, carts, news, revs, alerts,
      ] = await Promise.all([
        safeData(`/api/admin/analytics/kpis${q}`),
        safeData(`/api/admin/analytics/revenue-chart${q}`),
        safeData(`/api/admin/analytics/top-products${q}`),
        safeData(`/api/admin/analytics/top-customers${q}`),
        safeData(`/api/admin/analytics/conversion${q}`),
        safeData(`/api/admin/analytics/promos${q}`),
        safeData(`/api/admin/analytics/retention${q}`),
        safeData(`/api/admin/analytics/geo${q}`),
        safeData(`/api/admin/analytics/stock-dormant`),
        safe(`/api/admin/commandes-data?fields=slim`),
        safe(`/api/admin/abandoned-carts`),
        safe(`/api/admin/newsletter`),
        safe(`/api/admin/reviews`),
        safe(`/api/admin/stock-alerts`),
      ]);

      setKpis(kpisD); setRevenueChart(revD); setTopProducts(topPD); setTopCustomers(topCD);
      setConversion(convD); setPromos(promoD); setRetention(retD); setGeo(geoD); setStockDormant(dormantD);

      if (Array.isArray(slim)) setSlimOrders(slim); else anyError = true;
      if (carts?.carts && Array.isArray(carts.carts)) setAbandonedCarts(carts.carts);
      else if (Array.isArray(carts)) setAbandonedCarts(carts);
      if (news?.subscribers && Array.isArray(news.subscribers)) setNewsletter(news.subscribers);
      else if (Array.isArray(news)) setNewsletter(news);
      if (Array.isArray(revs)) setReviews(revs);
      if (Array.isArray(alerts)) setStockAlerts(alerts);
      else if (alerts?.data && Array.isArray(alerts.data)) setStockAlerts(alerts.data);

      setPartialData(anyError);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  // Chargement initial + à chaque changement de période + auto-refresh 5 min.
  useEffect(() => {
    load();
    const t = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [load]);

  const periodLabel = period === "all" ? "depuis le début" : `sur les ${period} derniers jours`;
  const showDelta   = period !== "all";

  // ── Statuts livraison (client-side, depuis slim orders filtrés période) ──────
  const shippingDonut = useMemo(() => {
    const fromMs = periodFromMs(period);
    const PAY_EXCL = ["annulee", "remboursee", "echec_paiement"];
    const counts: Record<string, number> = {};
    slimOrders
      .filter(o => new Date(o.created_at).getTime() >= fromMs)
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
  }, [slimOrders, period]);

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

  // ── Réassort : top produits demandés (client-side) ──────────────────────────
  const topAlerts = useMemo(() => {
    const map: Record<string, number> = {};
    stockAlerts.forEach((a: any) => {
      const name = a.product_name ?? a.name ?? "Produit";
      map[name] = (map[name] ?? 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [stockAlerts]);

  // ── Paniers abandonnés (client-side) ────────────────────────────────────────
  const cartsStats = useMemo(() => {
    const total     = abandonedCarts.length;
    const converted = abandonedCarts.filter((c: any) => c.converted).length;
    const recovery  = total > 0 ? (converted / total) * 100 : 0;
    return { total, converted, recovery };
  }, [abandonedCarts]);

  if (loading && !kpis) {
    return (
      <div style={{ padding: "36px 40px", background: C.bg, minHeight: "100vh" }}>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))" }}>
          {[0, 1, 2, 3].map(i => <Skeleton key={i} h={110} />)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "36px 40px", background: C.bg, minHeight: "100vh" }}>

      {/* ── EN-TÊTE ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 950, letterSpacing: -1, color: C.warm }}>Statistiques</h1>
          <div style={{ fontSize: 14, color: C.muted, marginTop: 6 }}>
            Tableau de bord complet M!LK · données {periodLabel}
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          {lastUpdated && (
            <span style={{ fontSize: 12, color: C.muted, whiteSpace: "nowrap" }}>
              Maj {lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button onClick={load} disabled={refreshing} title="Rafraîchir maintenant"
            style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${C.faint}`, background: C.card, color: C.warm, fontWeight: 800, fontSize: 13, cursor: refreshing ? "wait" : "pointer", opacity: refreshing ? 0.6 : 1, whiteSpace: "nowrap" }}>
            {refreshing ? "⟳ …" : "⟳ Rafraîchir"}
          </button>
          <div style={{ display: "flex", gap: 6, background: C.card, borderRadius: 12, padding: 4, border: `1px solid ${C.faint}` }}>
            {PERIODS.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                style={{ padding: "8px 16px", borderRadius: 9, border: "none", cursor: "pointer", background: period === p.key ? C.warm : "transparent", color: period === p.key ? "#000" : C.muted, fontWeight: 800, fontSize: 13, transition: "all 0.15s" }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {partialData && (
        <div style={{ marginBottom: 28, padding: "14px 20px", borderRadius: 12, background: "rgba(217,93,77,0.10)", border: `1px solid rgba(217,93,77,0.28)`, color: C.red, fontSize: 13, fontWeight: 700 }}>
          ⚠️ Certaines données sont incomplètes — actualisez ou contactez le support.
        </div>
      )}

      {/* ══ VENTES ══ */}
      <SectionTitle>Ventes</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
        {kpis ? (
          <>
            <KpiCard label="Chiffre d'affaires" value={eur(kpis.revenue)}        color={C.amber} delta={showDelta ? kpis.revenue_delta_pct : undefined} />
            <KpiCard label="Panier moyen"        value={eur(kpis.avg_basket, 2)}  delta={showDelta ? kpis.basket_delta_pct : undefined} />
            <KpiCard label="Clients uniques"     value={String(kpis.unique_customers)} sub={`${kpis.orders_count} commande(s)`} delta={showDelta ? kpis.orders_delta_pct : undefined} deltaLabel="commandes vs préc." />
            <KpiCard label="Taux de conversion"  value={conversion ? `${conversion.conversion_rate.toFixed(2)}%` : "—"} sub={conversion ? `${conversion.purchases} vente(s) / ${conversion.sessions} session(s)` : ""} color={C.green} />
          </>
        ) : <><Skeleton h={110} /><Skeleton h={110} /><Skeleton h={110} /><Skeleton h={110} /></>}
      </div>

      {/* CA par jour */}
      <div style={{ marginBottom: 24 }}>
        <Card title={`📈 Chiffre d'affaires ${periodLabel}`} lexique="CA par jour">
          {revenueChart ? <BarChart data={(revenueChart.points ?? []).map((p: any) => ({ label: p.label, value: p.revenue }))} /> : <Skeleton h={150} />}
        </Card>
      </div>

      {/* Top produits + Statuts livraison */}
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

      {/* ══ CLIENTS ══ */}
      <SectionTitle>Clients & acquisition</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
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

      {/* Géographie */}
      <div style={{ marginBottom: 24 }}>
        <Card title="🗺️ Top villes" lexique="Top villes">
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

      {/* ══ PROMOS ══ */}
      <SectionTitle>Codes promos</SectionTitle>
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

      {/* ══ STOCK ══ */}
      <SectionTitle>Stock</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <Card title="📦 Stock dormant (aucune vente depuis 30j)" lexique="Stock dormant">
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

      {/* ══ MARKETING ══ */}
      <SectionTitle>Marketing & satisfaction</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <Card title="📧 Newsletter" lexique="Newsletter">
          <div style={{ display: "flex", gap: 20, marginBottom: 12 }}>
            <div><div style={{ fontSize: 22, fontWeight: 950, color: C.amber }}>{newsletterTotal}</div><div style={{ fontSize: 11, color: C.muted }}>inscrits</div></div>
            <div><div style={{ fontSize: 22, fontWeight: 950, color: C.red }}>{newsletterDesab}</div><div style={{ fontSize: 11, color: C.muted }}>désabonnés</div></div>
          </div>
          {newsletterByMonth.length > 0 ? <BarChart data={newsletterByMonth} height={100} /> : <div style={{ color: C.muted, fontSize: 13 }}>Pas encore d'inscrits.</div>}
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

      {/* Paniers abandonnés */}
      <div style={{ marginBottom: 24 }}>
        <Card title="🛒 Paniers abandonnés" lexique="Paniers abandonnés">
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            <div><div style={{ fontSize: 22, fontWeight: 950, color: C.warm }}>{cartsStats.total}</div><div style={{ fontSize: 11, color: C.muted }}>paniers</div></div>
            <div><div style={{ fontSize: 22, fontWeight: 950, color: C.green }}>{cartsStats.converted}</div><div style={{ fontSize: 11, color: C.muted }}>récupérés</div></div>
            <div><div style={{ fontSize: 22, fontWeight: 950, color: C.amber }}>{cartsStats.recovery.toFixed(0)}%</div><div style={{ fontSize: 11, color: C.muted }}>taux de récupération</div></div>
          </div>
        </Card>
      </div>

      {/* Lexique footer */}
      <SectionTitle>Lexique</SectionTitle>
      <div style={{ background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.faint}`, display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: "10px 28px" }}>
        {Object.entries(LEXIQUE).map(([terme, { icon, def }]) => (
          <div key={terme} style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
            <span style={{ color: C.warm, fontWeight: 800 }}>{icon} {terme}</span> — {def}
          </div>
        ))}
      </div>
    </div>
  );
}
