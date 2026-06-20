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
import { isValidOrder, getNetAmount } from "@/lib/orders";

type Order  = { id: string; created_at: string; amount_total: number; customer_email: string; customer_name: string; status: string; shipping_status: string; items: any[]; promo_code?: string | null; discount?: number; shipping_address?: any; refund_amount?: number | null; };
type Period = "7j" | "30j" | "90j" | "tout";

const C = {
  bg: "#0d0b09", bg2: "#161210", card: "#1c1814",
  amber: "#c49a4a", warm: "#f2ede6",
  muted: "rgba(242,237,230,0.45)", faint: "rgba(242,237,230,0.08)",
  green: "#22c55e", red: "#ef4444", blue: "#3b82f6", purple: "#a855f7",
};

// ─── Lexique ──────────────────────────────────────────────────────────────────
const LEXIQUE: Record<string, { icon: string; def: string }> = {
  "Chiffre d'affaires":    { icon: "💶", def: "Total des ventes encaissées sur la période. C'est l'argent réellement reçu, hors TVA." },
  "Panier moyen":          { icon: "🛒", def: "Montant moyen dépensé par commande. Formule : CA ÷ nb commandes. Plus il est élevé, mieux c'est." },
  "Taux de conversion":    { icon: "🎯", def: "% de visiteurs qui passent commande. La moyenne e-commerce est 1–3%. Pas encore calculable sans tracker de visites." },
  "Taux d'annulation":     { icon: "↩️", def: "% de commandes annulées ou remboursées. Un taux élevé signale un problème produit ou livraison." },
  "Clients uniques":       { icon: "👤", def: "Nombre d'adresses email distinctes ayant commandé. Un client qui commande 2× compte pour 1." },
  "Taux de fidélité":      { icon: "🔁", def: "% de clients ayant commandé au moins 2 fois. Un client fidèle coûte 5× moins cher à garder qu'à acquérir." },
  "Heure de pointe":       { icon: "🕐", def: "Heure de la journée avec le plus de commandes. Utilisez-la pour programmer vos posts Instagram." },
  "Jour de pointe":        { icon: "📅", def: "Jour de la semaine avec le plus de commandes. Souvent lundi ou dimanche pour le e-commerce bébé." },
  "Newsletter":            { icon: "📧", def: "Nombre de personnes inscrites à votre liste email. Votre actif marketing le plus précieux — indépendant des algorithmes." },
  "Alertes réassort":      { icon: "🔔", def: "Clients ayant demandé à être alertés quand un produit épuisé revient. Indicateur fort d'intérêt produit." },
  "Codes promos":          { icon: "🏷️", def: "Nombre de fois qu'un code promo a été utilisé. Mesure l'efficacité de vos campagnes promotionnelles." },
  "Remises accordées":     { icon: "💸", def: "Valeur totale des réductions accordées. À surveiller pour ne pas trop rogner sur vos marges." },
  "Top produits":          { icon: "🏆", def: "Classement par CA généré. Le #1 est votre best-seller — mettez-le en avant sur la homepage et en story Instagram." },
  "Ventes par catégorie":  { icon: "📦", def: "Répartition des ventes entre Bodies, Pyjamas, Gigoteuses, etc. Utile pour orienter votre stock." },
  "CA par jour":           { icon: "📈", def: "Évolution du CA jour par jour. Les pics correspondent souvent à une story Instagram ou une campagne email." },
  "Statuts livraison":     { icon: "🚚", def: "Répartition des commandes par état : préparation, expédiée, livrée, retour. Détecte les retards." },
  "Avis clients":          { icon: "⭐", def: "Notes laissées par vos acheteurs. Les avis positifs augmentent la confiance des nouveaux visiteurs de +15%." },
  "Note moyenne":          { icon: "⭐", def: "Moyenne des étoiles sur 5. En dessous de 4/5, il faut investiguer les problèmes signalés." },
  "Vues de fiches":        { icon: "👁️", def: "Nombre de fois qu'une fiche produit a été ouverte. Un produit très vu mais peu acheté = problème de prix ou de description." },
  "Sessions uniques":      { icon: "🔗", def: "Nombre de visites distinctes (1 personne = 1 session même si elle revient). Plus fiable que les vues brutes." },
  "Vues par jour":         { icon: "📊", def: "Évolution du trafic jour par jour sur les fiches produit. Les pics correspondent souvent à une story Instagram." },
  "LTV moyenne":           { icon: "💎", def: "Lifetime Value : combien rapporte un client en moyenne sur toute sa durée de vie. Formule : CA total ÷ clients uniques. Plus c'est haut, plus vos clients sont fidèles." },
  "Nouveaux clients":      { icon: "✨", def: "Clients dont la toute première commande est dans la période sélectionnée. Indique la performance d'acquisition." },
  "Top clients":           { icon: "👑", def: "Vos meilleurs acheteurs classés par chiffre d'affaires généré. À choyer avec un programme de fidélité ou des avant-premières." },
  "Top villes":            { icon: "🗺️", def: "Villes d'où viennent vos commandes. Utile pour cibler la publicité locale ou repérer un bouche-à-oreille." },
  "Paniers abandonnés":    { icon: "🛒", def: "Visiteurs qui ont mis des articles au panier sans payer. Le tracker enregistre ces paniers et envoie 3 emails de relance (1h, 24h, 72h)." },
  "Tunnel de conversion":  { icon: "🎯", def: "% de sessions sur une fiche produit qui aboutissent à un achat. La moyenne e-commerce est 1–3%. En dessous de 1%, il y a un problème de prix, photos ou description." },
  "Stock dormant":         { icon: "📦", def: "Produits avec du stock mais aucune vente sur 30 jours. Capital immobilisé inutilement — candidats parfaits pour une promo ou une story Instagram dédiée." },
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

// ─── Page principale ──────────────────────────────────────────────────────────
export default function AdminStats() {
  const narrow = useIsNarrow();
  const [orders,         setOrders]         = useState<Order[]>([]);
  const [products,       setProducts]       = useState<any[]>([]);
  const [newsletter,     setNewsletter]     = useState<any[]>([]);
  const [stockAlerts,    setStockAlerts]    = useState<any[]>([]);
  const [promos,         setPromos]         = useState<any[]>([]);
  const [reviews,        setReviews]        = useState<any[]>([]);
  const [profiles,       setProfiles]       = useState<number>(0);
  const [pageViews,      setPageViews]      = useState<any>(null);
  const [abandonedCarts, setAbandonedCarts] = useState<any[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [period,         setPeriod]         = useState<Period>("30j");
  const [lastUpdated,    setLastUpdated]    = useState<Date | null>(null);
  const [refreshing,     setRefreshing]     = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [prods, ords, news, alerts, prms, revs, clients, pv, abc] = await Promise.all([
        adminFetch("/api/admin/products").then(r => r.json()).catch(() => []),
        adminFetch("/api/admin/commandes-data").then(r => r.json()).catch(() => []),
        adminFetch("/api/admin/newsletter").then(r => r.json()).catch(() => []),
        adminFetch("/api/admin/stock-alerts").then(r => r.json()).catch(() => []),
        adminFetch("/api/admin/promos").then(r => r.json()).catch(() => []),
        adminFetch("/api/admin/reviews").then(r => r.json()).catch(() => []),
        adminFetch("/api/admin/clients-count").then(r => r.json()).catch(() => ({ count: 0 })),
        adminFetch("/api/admin/page-views?days=30").then(r => r.json()).catch(() => null),
        adminFetch("/api/admin/abandoned-carts").then(r => r.json()).catch(() => ({ carts: [] })),
      ]);
      if (Array.isArray(prods))   setProducts(prods);
      if (Array.isArray(ords))    setOrders(ords);
      if (news?.subscribers && Array.isArray(news.subscribers)) setNewsletter(news.subscribers);
      else if (Array.isArray(news)) setNewsletter(news);
      if (Array.isArray(alerts))  setStockAlerts(alerts);
      else if (alerts?.data && Array.isArray(alerts.data)) setStockAlerts(alerts.data);
      if (Array.isArray(prms))    setPromos(prms);
      if (Array.isArray(revs))    setReviews(revs);
      setProfiles(clients?.count ?? 0);
      if (pv && !pv.error) setPageViews(pv);
      if (abc?.carts && Array.isArray(abc.carts)) setAbandonedCarts(abc.carts);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Chargement initial + rafraîchissement automatique toutes les 5 min (live).
  useEffect(() => {
    load();
    const t = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [load]);

  // Filtre période
  const filtered = useMemo(() => {
    if (period === "tout") return orders;
    const days = period === "7j" ? 7 : period === "30j" ? 30 : 90;
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
    return orders.filter(o => new Date(o.created_at) >= cutoff);
  }, [orders, period]);

  // Période précédente (pour delta)
  const prevFiltered = useMemo(() => {
    if (period === "tout") return [];
    const days = period === "7j" ? 7 : period === "30j" ? 30 : 90;
    const end = new Date(); end.setDate(end.getDate() - days);
    const start = new Date(end); start.setDate(start.getDate() - days);
    return orders.filter(o => { const d = new Date(o.created_at); return d >= start && d < end; });
  }, [orders, period]);

  // KPIs principaux — calculés UNIQUEMENT sur commandes valides
  // Helper memoizé pour éviter de filtrer 10 fois
  const validFiltered     = useMemo(() => filtered.filter(isValidOrder),     [filtered]);
  const validPrevFiltered = useMemo(() => prevFiltered.filter(isValidOrder), [prevFiltered]);

  const ca         = validFiltered.reduce((s, o) => s + getNetAmount(o), 0);
  const prevCa     = validPrevFiltered.reduce((s, o) => s + getNetAmount(o), 0);
  const nbOrders   = validFiltered.length;
  const prevOrders = validPrevFiltered.length;
  const avgCart    = nbOrders > 0 ? ca / nbOrders : 0;
  const prevAvg    = prevOrders > 0 ? prevCa / prevOrders : 0;
  // Clients uniques = ceux avec au moins UNE commande valide dans la période
  const clients    = new Set(validFiltered.map(o => o.customer_email).filter(Boolean)).size;

  const delta = (cur: number, prev: number) => prev > 0 ? ((cur - prev) / prev) * 100 : undefined;

  // ── KPIs AUJOURD'HUI vs HIER (temps réel) ─────────────────────────────────
  // Visiteurs = sessions uniques (page_views, via l'API). Commandes/Revenue =
  // commandes valides du jour. Conversion = commandes / visiteurs.
  const todayYesterday = useMemo(() => {
    const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
    const startYest  = new Date(startToday); startYest.setDate(startYest.getDate() - 1);
    const valid = orders.filter(isValidOrder);
    const ordToday = valid.filter(o => new Date(o.created_at) >= startToday);
    const ordYest  = valid.filter(o => { const d = new Date(o.created_at); return d >= startYest && d < startToday; });
    const revToday = ordToday.reduce((s, o) => s + getNetAmount(o), 0);
    const revYest  = ordYest.reduce((s, o) => s + getNetAmount(o), 0);
    const visToday = pageViews?.visitors_today     ?? 0;
    const visYest  = pageViews?.visitors_yesterday ?? 0;
    const convToday = visToday > 0 ? (ordToday.length / visToday) * 100 : 0;
    const convYest  = visYest  > 0 ? (ordYest.length  / visYest)  * 100 : 0;
    return {
      visToday, visYest,
      ordToday: ordToday.length, ordYest: ordYest.length,
      revToday, revYest, convToday, convYest,
    };
  }, [orders, pageViews]);

  // Clients fidèles (commandé 2+ fois VALIDES — annulées/remboursées exclues)
  const emailCount: Record<string, number> = {};
  orders.filter(isValidOrder).forEach(o => {
    if (o.customer_email) emailCount[o.customer_email] = (emailCount[o.customer_email] ?? 0) + 1;
  });
  const fideles = Object.values(emailCount).filter(n => n >= 2).length;
  const totalClients = Object.keys(emailCount).length;
  const tauxFidelite = totalClients > 0 ? (fideles / totalClients * 100).toFixed(0) : "0";

  // Taux annulation — numérateur inclut shipping_status=annulee + status remboursee/annulee
  // Dénominateur = TOUTES les commandes de la période (annulées comprises) pour
  // que le taux ait du sens : sur 100 commandes initiées, X% ont fini annulées.
  const annules    = filtered.filter(o => {
    const s = String(o.status ?? "").toLowerCase();
    const sh = String(o.shipping_status ?? "").toLowerCase();
    return s === "annulee" || s === "remboursee" || sh === "annulee";
  }).length;
  const tauxAnnul  = filtered.length > 0 ? ((annules / filtered.length) * 100).toFixed(1) : "0";

  // CA par jour
  const caByDay = useMemo(() => {
    const days = period === "7j" ? 7 : period === "30j" ? 30 : period === "90j" ? 90 : 30;
    const map: Record<string, number> = {};
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
      map[key] = 0;
    }
    validFiltered.forEach(o => {
      const key = new Date(o.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
      if (key in map) map[key] += getNetAmount(o);
    });
    return Object.entries(map).map(([label, value]) => ({ label, value }));
  }, [validFiltered, period]);

  // Heure de pointe
  const byHour: Record<number, number> = {};
  // Heure de pointe — basée sur commandes valides uniquement (annulées exclues)
  validFiltered.forEach(o => { const h = new Date(o.created_at).getHours(); byHour[h] = (byHour[h] ?? 0) + 1; });
  const peakHour = Object.entries(byHour).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  const hourData = Array.from({ length: 24 }, (_, h) => ({ label: `${h}h`, value: byHour[h] ?? 0 }));

  // Jour de pointe — commandes valides uniquement
  const JOURS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const byDay: Record<number, number> = {};
  validFiltered.forEach(o => { const d = new Date(o.created_at).getDay(); byDay[d] = (byDay[d] ?? 0) + 1; });
  const peakDay = Object.entries(byDay).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  const dayData = Array.from({ length: 7 }, (_, d) => ({ label: JOURS[d], value: byDay[d] ?? 0 }));

  // Top produits — commandes valides + CA net proratisé
  // Pour rembours_partiel: on multiplie chaque item par (getNetAmount / amount_total)
  // pour répartir équitablement le remboursement partiel sur tous les produits.
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; ca: number }> = {};
    validFiltered.forEach(o => {
      const total = Number(o.amount_total ?? 0);
      const net   = getNetAmount(o);
      const ratio = total > 0 ? net / total : 1;  // facteur de proratisation
      (Array.isArray(o.items) ? o.items : []).forEach((item: any) => {
        const key = item.name?.split(" — ")[0] ?? "Inconnu";
        if (!map[key]) map[key] = { name: key, qty: 0, ca: 0 };
        map[key].qty += item.quantity ?? 1;
        map[key].ca  += (item.price ?? 0) * (item.quantity ?? 1) * ratio;
      });
    });
    return Object.values(map).sort((a, b) => b.ca - a.ca).slice(0, 6);
  }, [validFiltered]);

  // Ventes par catégorie — commandes valides uniquement
  const byCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    validFiltered.forEach(o => {
      (Array.isArray(o.items) ? o.items : []).forEach((item: any) => {
        const cat = item.category_slug ?? "Autre";
        cats[cat] = (cats[cat] ?? 0) + (item.quantity ?? 1);
      });
    });
    const colors = [C.amber, "#e87b4a", C.blue, C.purple, C.green];
    return Object.entries(cats).map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }));
  }, [validFiltered]);

  // Statuts livraison — commandes valides uniquement (les annulées ont leur propre KPI)
  const byShipping = useMemo(() => {
    const map: Record<string, number> = { "En préparation": 0, "Expédiée": 0, "Livrée": 0, "Retour": 0 };
    validFiltered.forEach(o => {
      const s = o.shipping_status ?? "en_preparation";
      if (s === "en_preparation") map["En préparation"]++;
      if (s === "expediee")       map["Expédiée"]++;
      if (s === "livree")         map["Livrée"]++;
      if (s === "retour")         map["Retour"]++;
    });
    const colors = [C.amber, C.blue, C.green, C.red];
    return Object.entries(map).filter(([, v]) => v > 0).map(([label, value], i) => ({ label, value, color: colors[i] }));
  }, [validFiltered]);

  // Top alertes réassort (produits les plus demandés)
  const topAlerts = useMemo(() => {
    const map: Record<string, { name: string; count: number }> = {};
    stockAlerts.forEach((a: any) => {
      const key = a.product_id ?? a.product_name ?? "Inconnu";
      const name = a.product_name ?? a.products?.name ?? key;
      if (!map[key]) map[key] = { name, count: 0 };
      map[key].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [stockAlerts]);

  // Promos
  const totalPromosUsed  = promos.reduce((s: number, p: any) => s + (p.uses_count ?? 0), 0);
  const totalPromoAmount = filtered.reduce((s, o) => {
    const items = Array.isArray(o.items) ? o.items : [];
    return s; // approximation — on n'a pas le montant de remise par commande
  }, 0);

  // Avis
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s: number, r: any) => s + (r.rating ?? 5), 0) / reviews.length).toFixed(1)
    : null;
  const ratingDistrib = [5, 4, 3, 2, 1].map(star => ({
    label: `${star}★`,
    value: reviews.filter((r: any) => r.rating === star).length,
    color: star >= 4 ? C.green : star === 3 ? C.amber : C.red,
  }));

  // Newsletter par mois
  const newsletterByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    newsletter.forEach((n: any) => {
      if (!n.created_at) return;
      const key = new Date(n.created_at).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      map[key] = (map[key] ?? 0) + 1;
    });
    return Object.entries(map).slice(-6).map(([label, value]) => ({ label, value }));
  }, [newsletter]);

  // ─── Acquisition & Rétention ──────────────────────────────────────────────
  const firstOrderByEmail = useMemo(() => {
    const m: Record<string, string> = {};
    [...orders].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .forEach(o => {
        if (o.customer_email && !m[o.customer_email]) m[o.customer_email] = o.created_at;
      });
    return m;
  }, [orders]);

  const nouveauxClients = useMemo(() => {
    if (period === "tout") return Object.keys(firstOrderByEmail).length;
    const days = period === "7j" ? 7 : period === "30j" ? 30 : 90;
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
    return Object.values(firstOrderByEmail).filter(d => new Date(d) >= cutoff).length;
  }, [firstOrderByEmail, period]);

  const recurrentsClients = useMemo(() => {
    if (period === "tout") return 0;
    const days = period === "7j" ? 7 : period === "30j" ? 30 : 90;
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
    // Emails ayant une commande VALIDE dans la période
    const emailsInPeriod = new Set(validFiltered.map(o => o.customer_email).filter(Boolean));
    let count = 0;
    emailsInPeriod.forEach(email => {
      const firstDate = firstOrderByEmail[email];
      if (firstDate && new Date(firstDate) < cutoff) count++;
    });
    return count;
  }, [validFiltered, firstOrderByEmail, period]);

  // LTV = CA net total tous temps / clients ayant au moins UNE commande valide
  const ltv = useMemo(() => {
    const validOrds = orders.filter(isValidOrder);
    const emails    = new Set(validOrds.map(o => o.customer_email).filter(Boolean));
    if (emails.size === 0) return 0;
    const totalCa = validOrds.reduce((s, o) => s + getNetAmount(o), 0);
    return totalCa / emails.size;
  }, [orders]);

  const delaiRecommande = useMemo(() => {
    const byEmail: Record<string, string[]> = {};
    orders.forEach(o => {
      if (!o.customer_email) return;
      (byEmail[o.customer_email] ??= []).push(o.created_at);
    });
    const delays: number[] = [];
    Object.values(byEmail).forEach(dates => {
      if (dates.length < 2) return;
      const sorted = dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      const diff = (new Date(sorted[1]).getTime() - new Date(sorted[0]).getTime()) / (1000 * 60 * 60 * 24);
      delays.push(diff);
    });
    return delays.length ? delays.reduce((s, d) => s + d, 0) / delays.length : 0;
  }, [orders]);

  // ─── Top clients par CA NET (commandes valides uniquement) ────────────────
  const topClients = useMemo(() => {
    const m: Record<string, { email: string; name: string; nbOrders: number; ca: number; first: string; last: string }> = {};
    orders.filter(isValidOrder).forEach(o => {
      if (!o.customer_email) return;
      if (!m[o.customer_email]) {
        m[o.customer_email] = { email: o.customer_email, name: o.customer_name ?? "", nbOrders: 0, ca: 0, first: o.created_at, last: o.created_at };
      }
      const c = m[o.customer_email];
      c.nbOrders++;
      c.ca += getNetAmount(o);
      if (new Date(o.created_at) < new Date(c.first)) c.first = o.created_at;
      if (new Date(o.created_at) > new Date(c.last))  c.last  = o.created_at;
      if (o.customer_name && !c.name) c.name = o.customer_name;
    });
    return Object.values(m).sort((a, b) => b.ca - a.ca).slice(0, 10);
  }, [orders]);

  // ─── Géographie (commandes valides uniquement) ────────────────────────────
  const topVilles = useMemo(() => {
    const m: Record<string, number> = {};
    validFiltered.forEach(o => {
      const city = (o as any).shipping_address?.city;
      if (city) {
        const norm = String(city).trim();
        if (norm) m[norm] = (m[norm] ?? 0) + 1;
      }
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value }));
  }, [validFiltered]);

  // ─── Paniers abandonnés ──────────────────────────────────────────────────
  const cartsStats = useMemo(() => {
    const total       = abandonedCarts.length;
    const converted   = abandonedCarts.filter((c: any) => c.converted).length;
    const enCours     = abandonedCarts.filter((c: any) => !c.converted).length;
    const valeurPerdue = abandonedCarts.filter((c: any) => !c.converted).reduce((s, c: any) => s + Number(c.total ?? 0), 0);
    const tauxConv = total > 0 ? ((converted / total) * 100).toFixed(1) : "0";
    const relance1 = abandonedCarts.filter((c: any) => c.relance_1).length;
    const relance2 = abandonedCarts.filter((c: any) => c.relance_2).length;
    const relance3 = abandonedCarts.filter((c: any) => c.relance_3).length;
    return { total, converted, enCours, valeurPerdue, tauxConv, relance1, relance2, relance3 };
  }, [abandonedCarts]);

  // ─── Tunnel de conversion (ventes = commandes valides) ───────────────────
  const tunnelConv = useMemo(() => {
    if (!pageViews?.top_products) return [];
    const ventesParSlug: Record<string, number> = {};
    validFiltered.forEach(o => {
      (Array.isArray(o.items) ? o.items : []).forEach((item: any) => {
        const slug = item.slug ?? item.id;
        if (slug) ventesParSlug[slug] = (ventesParSlug[slug] ?? 0) + (item.quantity ?? 1);
      });
    });
    return pageViews.top_products.slice(0, 6).map((p: any) => {
      const ventes = ventesParSlug[p.slug] ?? 0;
      const tx = p.sessions > 0 ? (ventes / p.sessions) * 100 : 0;
      return { name: p.name, slug: p.slug, vues: p.views, sessions: p.sessions, ventes, tx };
    });
  }, [pageViews, validFiltered]);

  // ─── Performance promo (commandes valides uniquement, CA net) ────────────
  const promoPerf = useMemo(() => {
    const withPromo    = validFiltered.filter(o => o.promo_code);
    const withoutPromo = validFiltered.filter(o => !o.promo_code);
    const caWith    = withPromo.reduce   ((s, o) => s + getNetAmount(o), 0);
    const caWithout = withoutPromo.reduce((s, o) => s + getNetAmount(o), 0);
    const avgWith    = withPromo.length    > 0 ? caWith    / withPromo.length    : 0;
    const avgWithout = withoutPromo.length > 0 ? caWithout / withoutPromo.length : 0;
    const discountTotal = validFiltered.reduce((s, o) => s + Number((o as any).discount ?? 0), 0);
    return { nbWith: withPromo.length, nbWithout: withoutPromo.length, caWith, caWithout, avgWith, avgWithout, discountTotal };
  }, [validFiltered]);

  // ─── Évolution 12 mois (CA net, commandes valides uniquement) ────────────
  const caBy12Months = useMemo(() => {
    const map: Record<string, number> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      map[key] = 0;
    }
    orders.filter(isValidOrder).forEach(o => {
      const d = new Date(o.created_at);
      const key = d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      if (key in map) map[key] += getNetAmount(o);
    });
    return Object.entries(map).map(([label, value]) => ({ label, value }));
  }, [orders]);

  // ─── Stock dormant ────────────────────────────────────────────────────────
  const stockDormant = useMemo(() => {
    if (!products.length) return [];
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    const slugsVendus = new Set<string>();
    // Une "vente" pour le stock dormant = commande VALIDE (pas annulée/remboursée)
    orders.filter(o => isValidOrder(o) && new Date(o.created_at) >= cutoff).forEach(o => {
      (Array.isArray(o.items) ? o.items : []).forEach((item: any) => {
        if (item.slug) slugsVendus.add(item.slug);
        if (item.id)   slugsVendus.add(item.id);
      });
    });
    return products
      .filter((p: any) => (p.stock ?? 0) > 0 && !slugsVendus.has(p.slug) && !slugsVendus.has(p.id))
      .map((p: any) => ({ name: p.name, slug: p.slug, stock: p.stock ?? 0, valeur: (p.stock ?? 0) * (p.price_ttc ?? 0) }))
      .sort((a, b) => b.valeur - a.valeur).slice(0, 8);
  }, [products, orders]);

  // ─── Sources newsletter ───────────────────────────────────────────────────
  const newsletterSources = useMemo(() => {
    const m: Record<string, number> = {};
    newsletter.forEach((n: any) => {
      const src = n.source ?? "inconnu";
      m[src] = (m[src] ?? 0) + 1;
    });
    const colors = [C.amber, C.blue, C.purple, C.green, C.red];
    return Object.entries(m).map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }));
  }, [newsletter]);

  const newsletterDesabonnes = useMemo(
    () => newsletter.filter((n: any) => n.active === false).length,
    [newsletter]
  );

  if (loading) return (
    <div style={{ padding: 60, background: C.bg, minHeight: "100vh", color: C.muted, fontSize: 14 }}>
      Chargement des statistiques...
    </div>
  );

  const isEmpty = orders.length === 0;
  const periodLabel = period === "tout" ? "depuis le début" : `sur les ${period} derniers jours`;

  return (
    <div style={{ padding: "36px 40px", background: C.bg, minHeight: "100vh" }}>

      {/* ── EN-TÊTE ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 950, letterSpacing: -1, color: C.warm }}>Statistiques</h1>
          <div style={{ fontSize: 14, color: C.muted, marginTop: 6 }}>
            Tableau de bord complet M!LK · {isEmpty ? "En attente des premières données" : `${orders.length} commande(s) au total`}
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
          {(["7j", "30j", "90j", "tout"] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{ padding: "8px 16px", borderRadius: 9, border: "none", cursor: "pointer", background: period === p ? C.warm : "transparent", color: period === p ? "#000" : C.muted, fontWeight: 800, fontSize: 13, transition: "all 0.15s" }}>
              {p === "tout" ? "Tout" : p}
            </button>
          ))}
          </div>
        </div>
      </div>

      {isEmpty && (
        <div style={{ marginBottom: 28, padding: "16px 20px", borderRadius: 12, background: "rgba(196,154,74,0.08)", border: `1px solid rgba(196,154,74,0.2)`, color: C.amber, fontSize: 13, fontWeight: 700 }}>
          💡 Les graphiques se rempliront automatiquement dès les premières commandes. Les stats newsletter, alertes et avis sont déjà actives.
        </div>
      )}

      {/* ══ SECTION TEMPS RÉEL : AUJOURD'HUI vs HIER ══ */}
      <SectionTitle>⚡ Aujourd'hui vs hier</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <KpiCard label="Visiteurs"  value={String(todayYesterday.visToday)}            sub={`Hier : ${todayYesterday.visYest}`}                    color={C.purple} delta={delta(todayYesterday.visToday, todayYesterday.visYest)} deltaLabel="vs hier" />
        <KpiCard label="Commandes"  value={String(todayYesterday.ordToday)}            sub={`Hier : ${todayYesterday.ordYest}`}                                     delta={delta(todayYesterday.ordToday, todayYesterday.ordYest)} deltaLabel="vs hier" />
        <KpiCard label="Revenue"    value={`${todayYesterday.revToday.toFixed(2)} €`}  sub={`Hier : ${todayYesterday.revYest.toFixed(2)} €`}        color={C.amber}  delta={delta(todayYesterday.revToday, todayYesterday.revYest)} deltaLabel="vs hier" />
        <KpiCard label="Conversion" value={`${todayYesterday.convToday.toFixed(1)}%`}  sub={`Hier : ${todayYesterday.convYest.toFixed(1)}%`}        color={C.green}  delta={delta(todayYesterday.convToday, todayYesterday.convYest)} deltaLabel="vs hier" />
      </div>

      {/* ══ SECTION 1 : KPIs VENTES ══ */}
      <SectionTitle>Ventes & Commandes</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <KpiCard label="Chiffre d'affaires" value={`${ca.toFixed(2)} €`} sub={periodLabel} color={C.amber} delta={delta(ca, prevCa)} />
        <KpiCard label="Commandes"          value={String(nbOrders)}     sub="Commandes payées"         delta={delta(nbOrders, prevOrders)} />
        <KpiCard label="Panier moyen"       value={`${avgCart.toFixed(2)} €`} sub="Par commande"       delta={delta(avgCart, prevAvg)} />
        <KpiCard label="Clients uniques"    value={String(clients)}      sub="Emails distincts"  />
        <KpiCard label="Taux d'annulation"  value={`${tauxAnnul}%`}      sub={`${annules} commande(s)`} color={annules > 0 ? C.red : C.green} />
        <KpiCard label="Taux de fidélité"   value={`${tauxFidelite}%`}   sub={`${fideles} client(s) fidèles`} color={Number(tauxFidelite) > 20 ? C.green : C.amber} />
      </div>

      {/* ── CA PAR JOUR ── */}
      <div style={{ background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.faint}`, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: C.warm, marginBottom: 4 }}>📈 Chiffre d'affaires par jour</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Évolution du CA sur la période sélectionnée</div>
        <BarChart data={caByDay} height={150} />
        <LexiqueTag terme="CA par jour" />
      </div>

      {/* ── TOP PRODUITS + CATÉGORIES ── */}
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.faint}` }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.warm, marginBottom: 4 }}>🏆 Top produits vendus</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Classement par chiffre d'affaires généré</div>
          {topProducts.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 13, padding: "16px 0" }}>Aucune donnée sur cette période</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {topProducts.map((p, i) => (
                <div key={p.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 900, color: C.amber, minWidth: 18 }}>#{i + 1}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.warm }}>{p.name}</span>
                    </div>
                    <div style={{ display: "flex", gap: 10, fontSize: 12 }}>
                      <span style={{ color: C.muted }}>{p.qty} vte{p.qty > 1 ? "s" : ""}</span>
                      <span style={{ fontWeight: 900, color: C.amber }}>{p.ca.toFixed(0)} €</span>
                    </div>
                  </div>
                  <MiniBar value={p.ca} max={topProducts[0]?.ca ?? 1} />
                </div>
              ))}
            </div>
          )}
          <LexiqueTag terme="Top produits" />
        </div>

        <div style={{ background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.faint}` }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.warm, marginBottom: 4 }}>📦 Ventes par catégorie</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Répartition par type de produit</div>
          <DonutChart data={byCategory} />
          <LexiqueTag terme="Ventes par catégorie" />
        </div>
      </div>

      {/* ── STATUTS LIVRAISON ── */}
      <div style={{ background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.faint}`, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: C.warm, marginBottom: 4 }}>🚚 Statuts de livraison</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>État actuel des commandes en cours</div>
        {byShipping.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 13 }}>Aucune commande sur cette période</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
            {byShipping.map(s => (
              <div key={s.label} style={{ padding: "14px 16px", borderRadius: 12, background: `${s.color}15`, border: `1px solid ${s.color}30`, textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 950, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4, fontWeight: 700 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
        <LexiqueTag terme="Statuts livraison" />
      </div>

      {/* ══ SECTION 2 : TEMPORALITÉ ══ */}
      <SectionTitle>Comportement & Temporalité</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.faint}` }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.warm, marginBottom: 4 }}>
            🕐 Heure de pointe {peakHour ? `— ${peakHour[0]}h` : ""}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
            {peakHour ? `Pic à ${peakHour[0]}h avec ${peakHour[1]} commande(s)` : "Aucune donnée"}
          </div>
          <BarChart data={hourData} height={100} />
          <LexiqueTag terme="Heure de pointe" />
        </div>
        <div style={{ background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.faint}` }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.warm, marginBottom: 4 }}>
            📅 Jour de pointe {peakDay ? `— ${JOURS[Number(peakDay[0])]}` : ""}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
            {peakDay ? `Pic le ${JOURS[Number(peakDay[0])]} avec ${peakDay[1]} commande(s)` : "Aucune donnée"}
          </div>
          <BarChart data={dayData} height={100} />
          <LexiqueTag terme="Jour de pointe" />
        </div>
      </div>

      {/* ══ SECTION 3 : VUES PRODUITS ══ */}
      <SectionTitle>Produits les plus vus</SectionTitle>

      {/* KPIs vues */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        <KpiCard label="Vues de fiches"   value={pageViews ? String(pageViews.total_views) : "—"}     sub="Fiches produit ouvertes (30j)"   color={C.blue} />
        <KpiCard label="Sessions uniques" value={pageViews ? String(pageViews.unique_sessions) : "—"} sub="Visiteurs distincts (30j)"        color={C.purple} />
      </div>

      {/* ── ATTRIBUTION PAR CANAL (1st-party) ── */}
      <div style={{ background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.faint}`, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: C.warm, marginBottom: 4 }}>🌐 Trafic par canal (30j)</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>D'où viennent tes visiteurs — attribution interne (UTM + referrer), sans GA4 ni Meta API</div>
        {pageViews?.has_source && Array.isArray(pageViews?.by_source) && pageViews.by_source.length > 0 ? (
          <DonutChart data={pageViews.by_source.slice(0, 6).map((s: any, i: number) => ({
            label: `${s.source} — ${s.sessions} visiteur${s.sessions > 1 ? "s" : ""}`,
            value: s.sessions,
            color: ["#c49a4a", "#5b8def", "#a78bfa", "#34d399", "#f87171", "#9ca3af"][i % 6],
          }))} />
        ) : (
          <div style={{ color: C.muted, fontSize: 13, padding: "8px 0", lineHeight: 1.7 }}>
            {pageViews && pageViews.has_source === false
              ? "⏳ Lance la migration 007_page_views_attribution.sql dans le SQL Editor Supabase pour activer l'attribution par canal. Les données apparaîtront ensuite au fil des visites."
              : "Aucune donnée d'attribution pour l'instant — les visiteurs seront classés par canal dès les prochaines visites."}
          </div>
        )}
      </div>

      {/* Graphique vues par jour + top produits vus */}
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.faint}` }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.warm, marginBottom: 4 }}>📊 Vues par jour (30j)</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Trafic sur les fiches produit</div>
          {pageViews?.by_day ? <BarChart data={pageViews.by_day} height={120} /> : (
            <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 30 }}>
              Aucune donnée — le tracker s'activera dès la prochaine visite
            </div>
          )}
          <LexiqueTag terme="Vues par jour" />
        </div>

        <div style={{ background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.faint}` }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.warm, marginBottom: 4 }}>👁️ Fiches les plus visitées</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Top 10 produits par nombre de vues</div>
          {pageViews?.top_products?.length > 0 ? (
            <div style={{ display: "grid", gap: 10 }}>
              {pageViews.top_products.slice(0, 6).map((p: any, i: number) => (
                <div key={p.slug}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 900, color: C.amber, minWidth: 18 }}>#{i + 1}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.warm }}>{p.name}</span>
                    </div>
                    <div style={{ display: "flex", gap: 10, fontSize: 12 }}>
                      <span style={{ color: C.muted }}>{p.sessions} sess.</span>
                      <span style={{ fontWeight: 900, color: C.blue }}>{p.views} vues</span>
                    </div>
                  </div>
                  <MiniBar value={p.views} max={pageViews.top_products[0]?.views ?? 1} color={C.blue} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 30 }}>
              Le tracker s'active à la prochaine visite d'une fiche produit
            </div>
          )}
          <LexiqueTag terme="Vues de fiches" />
        </div>
      </div>

      {/* ══ SECTION 4 : AUDIENCE & ENGAGEMENT ══ */}
      <SectionTitle>Audience & Engagement</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        <KpiCard label="Newsletter"      value={String(newsletter.length)}  sub="Inscrits email total"         color={C.blue} />
        <KpiCard label="Alertes réassort" value={String(stockAlerts.length)} sub="Demandes de retour en stock"  color={C.amber} />
        <KpiCard label="Codes promos"    value={String(totalPromosUsed)}    sub="Utilisations au total"         color={C.purple} />
        <KpiCard label="Avis clients"    value={String(reviews.length)}     sub={avgRating ? `Note moy. ${avgRating}/5` : "Aucun avis"} color={C.green} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 20 }}>

        {/* Newsletter par mois */}
        <div style={{ background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.faint}` }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.warm, marginBottom: 4 }}>📧 Inscriptions newsletter</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Nouveaux inscrits par mois (6 derniers mois)</div>
          <BarChart data={newsletterByMonth} height={100} />
          <LexiqueTag terme="Newsletter" />
        </div>

        {/* Top alertes réassort */}
        <div style={{ background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.faint}` }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.warm, marginBottom: 4 }}>🔔 Produits les plus demandés (réassort)</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Produits épuisés les plus attendus par les clients</div>
          {topAlerts.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 13, padding: "16px 0" }}>Aucune alerte réassort pour l'instant</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {topAlerts.map((a, i) => (
                <div key={a.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.warm }}>{a.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 900, color: C.amber }}>{a.count} alerte{a.count > 1 ? "s" : ""}</span>
                  </div>
                  <MiniBar value={a.count} max={topAlerts[0]?.count ?? 1} color={C.blue} />
                </div>
              ))}
            </div>
          )}
          <LexiqueTag terme="Alertes réassort" />
        </div>
      </div>

      {/* ── AVIS CLIENTS ── */}
      <div style={{ background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.faint}`, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: C.warm, marginBottom: 4 }}>⭐ Avis clients</div>
            <div style={{ fontSize: 12, color: C.muted }}>Répartition des notes reçues</div>
          </div>
          {avgRating && (
            <div style={{ textAlign: "center", padding: "10px 20px", borderRadius: 12, background: "rgba(34,197,94,0.1)", border: `1px solid ${C.green}30` }}>
              <div style={{ fontSize: 28, fontWeight: 950, color: C.green }}>{avgRating}</div>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>/ 5 · {reviews.length} avis</div>
            </div>
          )}
        </div>
        {reviews.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 13 }}>Aucun avis pour l'instant</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {ratingDistrib.map(r => (
              <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: C.muted, minWidth: 24 }}>{r.label}</span>
                <div style={{ flex: 1, height: 8, background: C.faint, borderRadius: 99 }}>
                  <div style={{ height: "100%", width: `${(r.value / reviews.length) * 100}%`, background: r.color, borderRadius: 99 }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.warm, minWidth: 20, textAlign: "right" }}>{r.value}</span>
              </div>
            ))}
          </div>
        )}
        <LexiqueTag terme="Note moyenne" />
      </div>

      {/* ══ SECTION 5 : CODES PROMOS ══ */}
      <SectionTitle>Codes promos</SectionTitle>
      <div style={{ background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.faint}`, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: C.warm, marginBottom: 16 }}>🏷️ Performance des codes promo</div>
        {promos.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 13 }}>Aucun code promo créé</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 400 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.faint}` }}>
                  {["Code", "Remise", "Utilisations", "Limite", "Actif"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" as const, color: C.muted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {promos.slice(0, 8).map((p: any, i: number) => {
                  const isActive = p.active !== false && (!p.expires_at || new Date(p.expires_at) > new Date());
                  return (
                    <tr key={p.id} style={{ borderBottom: `1px solid ${C.faint}` }}>
                      <td style={{ padding: "10px 12px", fontWeight: 800, color: C.amber, fontSize: 14, fontFamily: "monospace" }}>{p.code}</td>
                      <td style={{ padding: "10px 12px", fontSize: 13, color: C.warm }}>
                        {p.discount_type === "percent" ? `${p.discount_value}%` : `${p.discount_value} €`}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 13, color: C.warm, fontWeight: 700 }}>
                        {p.uses_count ?? 0}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 13, color: C.muted }}>
                        {p.max_uses ? `${p.uses_count ?? 0} / ${p.max_uses}` : "Illimité"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ padding: "3px 8px", borderRadius: 99, fontSize: 11, fontWeight: 800, background: isActive ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: isActive ? C.green : C.red }}>
                          {isActive ? "Actif" : "Inactif"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <LexiqueTag terme="Codes promos" />
      </div>

      {/* ══ SECTION 6 : ACQUISITION & RÉTENTION ══ */}
      <SectionTitle>Acquisition & Rétention clients</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        <KpiCard label="Nouveaux clients"   value={String(nouveauxClients)}     sub={periodLabel}                                    color={C.green} />
        <KpiCard label="Clients récurrents" value={String(recurrentsClients)}   sub="Anciens revenus sur la période"                color={C.blue} />
        <KpiCard label="LTV moyenne"        value={`${ltv.toFixed(2)} €`}        sub="Valeur vie client"                              color={C.amber} />
        <KpiCard label="Délai 2è commande"  value={delaiRecommande > 0 ? `${delaiRecommande.toFixed(0)} j` : "—"} sub="Entre 1ère et 2ème" color={C.purple} />
      </div>

      <div style={{ background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.faint}`, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: C.warm, marginBottom: 4 }}>👑 Top clients par chiffre d'affaires</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Vos meilleurs acheteurs sur l'ensemble de la base</div>
        {topClients.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 13, padding: "16px 0" }}>Aucune commande pour l'instant</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 540 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.faint}` }}>
                  {["#", "Client", "Commandes", "CA total", "Panier moyen", "Dernière"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" as const, color: C.muted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topClients.map((c, i) => (
                  <tr key={c.email} style={{ borderBottom: `1px solid ${C.faint}` }}>
                    <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 900, color: C.amber }}>#{i + 1}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: C.warm }}>{c.name || c.email.split("@")[0]}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{c.email}</div>
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: C.warm, fontWeight: 700 }}>{c.nbOrders}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 900, color: C.amber }}>{c.ca.toFixed(2)} €</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: C.muted }}>{(c.ca / c.nbOrders).toFixed(2)} €</td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: C.muted }}>
                      {new Date(c.last).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <LexiqueTag terme="Top clients" />
      </div>

      {/* ══ SECTION 7 : GÉOGRAPHIE ══ */}
      <SectionTitle>Géographie des commandes</SectionTitle>
      <div style={{ background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.faint}`, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: C.warm, marginBottom: 4 }}>🗺️ Top villes de livraison</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Répartition géographique des commandes ({periodLabel})</div>
        {topVilles.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 13, padding: "16px 0" }}>Aucune adresse de livraison sur la période</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {topVilles.map((v, i) => (
              <div key={v.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 900, color: C.amber, minWidth: 18 }}>#{i + 1}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.warm }}>{v.label}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 900, color: C.amber }}>{v.value} commande{v.value > 1 ? "s" : ""}</span>
                </div>
                <MiniBar value={v.value} max={topVilles[0]?.value ?? 1} />
              </div>
            ))}
          </div>
        )}
        <LexiqueTag terme="Top villes" />
      </div>

      {/* ══ SECTION 8 : PANIERS ABANDONNÉS ══ */}
      <SectionTitle>Paniers abandonnés & Relances</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        <KpiCard label="Paniers en cours" value={String(cartsStats.enCours)} sub="Non convertis" color={C.amber} />
        <KpiCard label="Valeur perdue"    value={`${cartsStats.valeurPerdue.toFixed(0)} €`} sub="Potentiel non converti" color={C.red} />
        <KpiCard label="Convertis"        value={String(cartsStats.converted)} sub={`${cartsStats.tauxConv}% de récupération`} color={C.green} />
        <KpiCard label="Paniers total"    value={String(cartsStats.total)} sub="Tout temps" color={C.blue} />
      </div>

      <div style={{ background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.faint}`, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: C.warm, marginBottom: 4 }}>📧 Pipeline de relance email</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Relance 1 (1h–24h), Relance 2 (24h–72h + promo), Relance 3 (&gt; 72h)</div>
        <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "repeat(3, 1fr)", gap: 12 }}>
          {[
            { step: "Relance #1", value: cartsStats.relance1, color: C.amber },
            { step: "Relance #2", value: cartsStats.relance2, color: C.blue },
            { step: "Relance #3", value: cartsStats.relance3, color: C.red },
          ].map(r => (
            <div key={r.step} style={{ padding: "14px 16px", borderRadius: 12, background: `${r.color}15`, border: `1px solid ${r.color}30`, textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 950, color: r.color }}>{r.value}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4, fontWeight: 700 }}>{r.step}</div>
            </div>
          ))}
        </div>
        <LexiqueTag terme="Paniers abandonnés" />
      </div>

      {/* ══ SECTION 9 : TUNNEL DE CONVERSION ══ */}
      <SectionTitle>Tunnel de conversion (Vues → Ventes)</SectionTitle>
      <div style={{ background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.faint}`, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: C.warm, marginBottom: 4 }}>🎯 Taux de transformation par produit</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Top 6 fiches : combien de sessions aboutissent à un achat ?</div>
        {tunnelConv.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 13, padding: "16px 0" }}>En attente de vues et de ventes sur la période</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.faint}` }}>
                  {["Produit", "Sessions", "Ventes", "Conversion"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" as const, color: C.muted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tunnelConv.map((p: any) => (
                  <tr key={p.slug} style={{ borderBottom: `1px solid ${C.faint}` }}>
                    <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 700, color: C.warm }}>{p.name}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: C.muted }}>{p.sessions}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 700, color: C.warm }}>{p.ventes}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 900,
                        background: p.tx >= 3 ? "rgba(34,197,94,0.15)" : p.tx >= 1 ? "rgba(196,154,74,0.15)" : "rgba(239,68,68,0.15)",
                        color: p.tx >= 3 ? C.green : p.tx >= 1 ? C.amber : C.red }}>
                        {p.tx.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <LexiqueTag terme="Tunnel de conversion" />
      </div>

      {/* ══ SECTION 10 : PERFORMANCE PROMO ══ */}
      <SectionTitle>Performance des codes promo</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.faint}` }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.warm, marginBottom: 4 }}>🎟️ Avec promo</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>{promoPerf.nbWith} commande{promoPerf.nbWith > 1 ? "s" : ""}</div>
          <div style={{ fontSize: 32, fontWeight: 950, color: C.amber, lineHeight: 1 }}>{promoPerf.caWith.toFixed(0)} €</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>Panier moyen : <strong style={{ color: C.warm }}>{promoPerf.avgWith.toFixed(2)} €</strong></div>
          <div style={{ fontSize: 12, color: C.red, marginTop: 4 }}>Remises accordées : −{promoPerf.discountTotal.toFixed(2)} €</div>
        </div>
        <div style={{ background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.faint}` }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.warm, marginBottom: 4 }}>💳 Sans promo</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>{promoPerf.nbWithout} commande{promoPerf.nbWithout > 1 ? "s" : ""}</div>
          <div style={{ fontSize: 32, fontWeight: 950, color: C.warm, lineHeight: 1 }}>{promoPerf.caWithout.toFixed(0)} €</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>Panier moyen : <strong style={{ color: C.warm }}>{promoPerf.avgWithout.toFixed(2)} €</strong></div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            {promoPerf.avgWith > 0 && promoPerf.avgWithout > 0 && (
              <>Écart panier : <strong style={{ color: promoPerf.avgWith > promoPerf.avgWithout ? C.green : C.red }}>
                {((promoPerf.avgWith - promoPerf.avgWithout) / promoPerf.avgWithout * 100).toFixed(0)}%
              </strong></>
            )}
          </div>
        </div>
      </div>

      {/* ══ SECTION 11 : ÉVOLUTION 12 MOIS ══ */}
      <SectionTitle>Évolution longue durée</SectionTitle>
      <div style={{ background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.faint}`, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: C.warm, marginBottom: 4 }}>📈 Chiffre d'affaires — 12 derniers mois</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Tendance annuelle pour identifier saisonnalité et croissance</div>
        <BarChart data={caBy12Months} height={160} />
      </div>

      {/* ══ SECTION 12 : STOCK DORMANT ══ */}
      <SectionTitle>Stock dormant — produits sans vente sur 30j</SectionTitle>
      <div style={{ background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.faint}`, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: C.warm, marginBottom: 4 }}>📦 Produits avec stock mais sans vente récente</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Valeur immobilisée — bons candidats pour une promo ou un push email</div>
        {stockDormant.length === 0 ? (
          <div style={{ color: C.green, fontSize: 13, padding: "8px 0", fontWeight: 700 }}>
            ✓ Tous vos produits en stock se sont vendus ces 30 derniers jours
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 420 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.faint}` }}>
                  {["Produit", "Stock", "Valeur immobilisée"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" as const, color: C.muted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stockDormant.map((p: any) => (
                  <tr key={p.slug} style={{ borderBottom: `1px solid ${C.faint}` }}>
                    <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 700, color: C.warm }}>{p.name}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: C.amber, fontWeight: 800 }}>{p.stock}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: C.red, fontWeight: 800 }}>{p.valeur.toFixed(0)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <LexiqueTag terme="Stock dormant" />
      </div>

      {/* ══ SECTION 13 : NEWSLETTER AVANCÉE ══ */}
      <SectionTitle>Newsletter — détails</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.faint}` }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.warm, marginBottom: 4 }}>📊 Sources d'inscription</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>D'où viennent vos abonnés</div>
          {newsletterSources.length > 0 ? <DonutChart data={newsletterSources} /> : (
            <div style={{ color: C.muted, fontSize: 13, padding: "8px 0" }}>Pas encore d'inscrits</div>
          )}
        </div>
        <div style={{ background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.faint}` }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.warm, marginBottom: 4 }}>🚫 Désabonnements</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Indicateur de la santé de votre liste</div>
          <div style={{ fontSize: 36, fontWeight: 950, color: newsletterDesabonnes > 0 ? C.red : C.green, lineHeight: 1 }}>
            {newsletterDesabonnes}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
            Sur {newsletter.length} inscrit{newsletter.length > 1 ? "s" : ""}
            {newsletter.length > 0 && (
              <> · Taux : <strong style={{ color: newsletterDesabonnes / newsletter.length > 0.1 ? C.red : C.green }}>
                {((newsletterDesabonnes / newsletter.length) * 100).toFixed(1)}%
              </strong></>
            )}
          </div>
        </div>
      </div>

      {/* ══ LEXIQUE COMPLET ══ */}
      <SectionTitle>Lexique — comprendre vos statistiques</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {Object.entries(LEXIQUE).map(([terme, entry]) => (
          <div key={terme} style={{ background: C.card, borderRadius: 14, padding: "16px 18px", border: `1px solid ${C.faint}` }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: C.warm, marginBottom: 6 }}>
              {entry.icon} {terme}
            </div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.65 }}>{entry.def}</div>
          </div>
        ))}
      </div>

    </div>
  );
}