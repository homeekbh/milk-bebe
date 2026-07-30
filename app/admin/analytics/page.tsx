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
import WorldVisitorsMap from "@/components/admin/WorldVisitorsMap";
import { C, CHANNEL_COLORS, CHANNEL_LABELS_FR, WEEKDAYS } from "@/components/admin/analytics/tokens";
import { KpiCard, SectionTitle, Card, LEXIQUE } from "@/components/admin/analytics/ui";
import { BarChart, MiniBar, DonutChart, HBars, SessionsLineChart, NewVsReturningChart, FunnelChart, LineChart, TrafficHeatmap } from "@/components/admin/analytics/charts";

type PeriodKey = "1" | "3" | "7" | "30" | "90" | "all";




function Skeleton({ h = 80 }: { h?: number }) {
  return <div style={{ height: h, borderRadius: 12, background: "rgba(242,237,230,0.04)", border: `1px solid ${C.faint}`, display: "grid", placeItems: "center", color: C.muted, fontSize: 12 }}>Chargement…</div>;
}

// ─── Helpers format ───────────────────────────────────────────────────────────
const eur  = (n: any, dec = 0) => `${(Number(n) || 0).toLocaleString("fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec })} €`;
const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "1", label: "24h" }, { key: "3", label: "3j" }, { key: "7", label: "7j" }, { key: "30", label: "30j" }, { key: "90", label: "90j" }, { key: "all", label: "Tout" },
];
function periodFromMs(p: PeriodKey): number {
  if (p === "all") return new Date("2024-01-01").getTime();
  const days = p === "1" ? 1 : p === "3" ? 3 : p === "7" ? 7 : p === "30" ? 30 : 90;
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

// ─── Sélecteur calendaire (Lot G-2) ─────────────────────────────────────────
// Première ligne de page_views en base (borne min des champs date).
const DATA_MIN_DATE = "2026-05-13";
// "YYYY-MM-DD" → Date à minuit LOCAL (navigateur = Paris pour Bou) : pas de
// décalage d'un jour comme le ferait new Date("YYYY-MM-DD") (parsé en UTC).
function ymdToLocal(s: string): Date { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
function todayYmd(): string { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
// "mardi 28 juillet 2026"
function fmtLongDay(s: string): string { return ymdToLocal(s).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
// "du 20 au 27 juillet 2026" (compacté si même mois/année)
function fmtRangeLabel(a: string, b: string): string {
  const da = ymdToLocal(a), db = ymdToLocal(b);
  if (da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth())
    return `du ${da.getDate()} au ${db.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`;
  if (da.getFullYear() === db.getFullYear())
    return `du ${da.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} au ${db.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`;
  return `du ${da.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} au ${db.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`;
}
const dateInputStyle = (active: boolean): React.CSSProperties => ({
  background: "#0d0b09", color: active ? "#f2ede6" : "rgba(242,237,230,0.7)",
  border: `1px solid ${active ? "#c49a4a" : "rgba(242,237,230,0.15)"}`,
  borderRadius: 8, padding: "8px 10px", fontSize: 13, fontWeight: 700,
  minHeight: 44, colorScheme: "dark", cursor: "pointer",
});
const selectStyle = dateInputStyle; // même look pour les <select> (jour de semaine / profondeur)

// ─── Comparaisons calendaires (Lot G-3) ─────────────────────────────────────
const WEEKDAY_LONG = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]; // 0 = lundi (comme WEEKDAYS)
function fmtYmdLocalDate(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function shiftYmd(s: string, days: number): string { const d = ymdToLocal(s); d.setDate(d.getDate() + days); return fmtYmdLocalDate(d); }
// "mardi 28 juillet" (sans année — libellés de comparaison lisibles)
function fmtDayShort(s: string): string { return ymdToLocal(s).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }); }
// Les `depth` dernières occurrences calendaires (Paris/local) d'un jour de semaine
// (0=lundi … 6=dimanche), bornées à DATA_MIN_DATE, en ordre chronologique.
function weekdayOccurrences(weekday: number, depth: number): string[] {
  const min = ymdToLocal(DATA_MIN_DATE).getTime();
  const t = new Date(); t.setHours(0, 0, 0, 0);
  while (((t.getDay() + 6) % 7) !== weekday) t.setDate(t.getDate() - 1);
  const out: string[] = [];
  for (let i = 0; i < depth; i++) { if (t.getTime() < min) break; out.push(fmtYmdLocalDate(t)); t.setDate(t.getDate() - 7); }
  return out.reverse();
}
// Écart % (null si base nulle → non calculable).
function pctDelta(cur: number, ref: number): number | null { if (!ref) return null; return ((cur - ref) / ref) * 100; }
// Badge d'écart signé, coloré selon le SENS FAVORABLE de la métrique (pas selon le
// signe brut) : une baisse du taux de rebond est une bonne nouvelle → verte.
function DeltaBadge({ d, better, lowVol }: { d: number | null; better: "up" | "down"; lowVol?: boolean }) {
  if (d == null) return <span style={{ color: "rgba(242,237,230,0.45)", fontSize: 12 }}>n/a</span>;
  const favorable = better === "up" ? d >= 0 : d <= 0;
  const col = lowVol ? "rgba(242,237,230,0.45)" : (favorable ? "#22c55e" : "#ef4444");
  return <span style={{ color: col, fontWeight: 800, fontSize: 13, whiteSpace: "nowrap" }}>{d >= 0 ? "▲ +" : "▼ "}{d.toFixed(1)}%</span>;
}
const fmtDur = (sec: number | null | undefined): string => {
  if (sec == null) return "—";
  const s = Math.round(Number(sec)); const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
};
const DEVICE_ICON: Record<string, string> = { mobile: "📱", tablet: "💻", desktop: "🖥" };

// Placeholder quand aucune donnée de comportement (PATCH) n'est encore arrivée.
function BehaviorPlaceholder() {
  return (
    <div style={{ textAlign: "center", padding: "32px", color: C.muted, fontSize: 13 }}>
      📊 Les données de comportement apparaîtront<br />après les premières visites complètes
    </div>
  );
}







// ─── Page principale ──────────────────────────────────────────────────────────
export default function AdminStats() {
  const narrow = useIsNarrow();

  const [period, setPeriod] = useState<PeriodKey>("30");
  const [excludeBots, setExcludeBots] = useState(false); // toggle « exclure les bots » (page-views + conversion : seuls endpoints comptant de vraies sessions)

  // ── Sélecteur calendaire (Lots G-2/G-3) — 4 modes EXCLUSIFS pilotant TOUTE la page :
  //    "period" = boutons glissants · "day" = ?date= · "range" = ?from=&to=
  //    "weekday" = agrégat « tous les <jour> » (plage englobante ?from=&to= + filtre client)
  const [mode,        setMode]        = useState<"period" | "day" | "range" | "weekday">("period");
  const [dayStr,      setDayStr]      = useState("");
  const [rangeFrom,   setRangeFrom]   = useState("");
  const [rangeTo,     setRangeTo]     = useState("");
  const [serverError, setServerError] = useState<string | null>(null); // message 400 de l'API (bornes invalides)

  // ── Comparaisons (Lot G-3) ──────────────────────────────────────────────────
  const [compareDate, setCompareDate] = useState("");        // G-3a : 2e jour de référence (mode "day")
  const [cmp,         setCmp]         = useState<any>(null);  // données du jour de référence { pv, kpis, conversion }
  const [weekday,     setWeekday]     = useState(0);          // G-3b : 0=lundi … 6=dimanche
  const [wdDepth,     setWdDepth]     = useState(8);          // G-3b : nb d'occurrences (4/8/12)

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
  const [pageViews,    setPageViews]    = useState<any>(null);
  const [accounts,     setAccounts]     = useState<any>(null);
  const [wishlist,     setWishlist]     = useState<any>(null);

  // Expansion « voir plus » des tableaux trafic (ex-TrafficSection, désormais inline).
  const [showAllPages,     setShowAllPages]     = useState(false);
  const [showAllCountries, setShowAllCountries] = useState(false);
  const [showAllCities,    setShowAllCities]    = useState(false);

  // Données client-side conservées
  const [slimOrders,     setSlimOrders]     = useState<any[]>([]);
  const [abandonedCarts, setAbandonedCarts] = useState<any[]>([]);
  const [newsletter,     setNewsletter]     = useState<any[]>([]);
  const [reviews,        setReviews]        = useState<any[]>([]);
  const [stockAlerts,    setStockAlerts]    = useState<any[]>([]);

  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [failedEndpoints, setFailedEndpoints] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    // Collecte des endpoints en échec (nom = dernier segment de l'URL) + messages
    // d'erreur explicites (ex. 400 « date future » du Lot G-1 → affiché, jamais muet).
    const failed = new Set<string>();
    const errorMsgs = new Set<string>();
    const nameOf = (url: string) => url.split("?")[0].split("/").pop() || url;

    // safe() : renvoie le JSON parsé ou null, et enregistre l'endpoint en échec.
    const safe = async (url: string): Promise<any> => {
      try {
        const r = await adminFetch(url);
        if (!r.ok) {
          failed.add(nameOf(url));
          try { const j = await r.json(); if (j?.error) errorMsgs.add(String(j.error)); } catch {}
          return null;
        }
        return await r.json();
      } catch { failed.add(nameOf(url)); return null; }
    };
    // Route analytics standardisée { data, error }
    const safeData = async (url: string): Promise<any> => {
      const j = await safe(url);
      if (!j) return null;                              // échec réseau déjà compté par safe()
      if (j.error) { failed.add(nameOf(url)); errorMsgs.add(String(j.error)); return null; }
      return j.data ?? null;
    };

    // Query calendaire (Lots G-2/G-3) : date/plage/weekday priment sur period.
    let q = `?period=${period}`;
    if (mode === "day" && dayStr) {
      q = `?date=${dayStr}`;
    } else if (mode === "range" && rangeFrom && rangeTo) {
      const a = rangeFrom <= rangeTo ? rangeFrom : rangeTo;
      const b = rangeFrom <= rangeTo ? rangeTo : rangeFrom;
      q = `?from=${a}&to=${b}`;
    } else if (mode === "weekday") {
      // Plage CONTIGUË englobante (1er → dernier <jour>) ; le filtre par occurrence
      // se fait côté client sur by_day (Lot G-3b, voie A).
      const occ = weekdayOccurrences(weekday, wdDepth);
      if (occ.length) q = `?from=${occ[0]}&to=${occ[occ.length - 1]}`;
    }
    try {
      const [
        kpisD, revD, topPD, topCD, convD, promoD, retD, geoD, dormantD, pvD, accD, wishD,
        slim, carts, news, revs, alerts,
      ] = await Promise.all([
        safeData(`/api/admin/analytics/kpis${q}`),
        safeData(`/api/admin/analytics/revenue-chart${q}`),
        safeData(`/api/admin/analytics/top-products${q}`),
        safeData(`/api/admin/analytics/top-customers${q}`),
        safeData(`/api/admin/analytics/conversion${q}&bots=${excludeBots ? "exclude" : "all"}`),
        safeData(`/api/admin/analytics/promos${q}`),
        safeData(`/api/admin/analytics/retention${q}`),
        safeData(`/api/admin/analytics/geo${q}`),
        safeData(`/api/admin/analytics/stock-dormant`),
        safeData(`/api/admin/page-views${q}&bots=${excludeBots ? "exclude" : "all"}`),
        safeData(`/api/admin/analytics/accounts-count${q}`),
        safeData(`/api/admin/analytics/wishlist${q}`),
        safe(`/api/admin/commandes-data?fields=slim`),
        safe(`/api/admin/abandoned-carts`),
        safe(`/api/admin/newsletter`),
        safe(`/api/admin/reviews`),
        safe(`/api/admin/stock-alerts`),
      ]);

      setKpis(kpisD); setRevenueChart(revD); setTopProducts(topPD); setTopCustomers(topCD);
      setConversion(convD); setPromos(promoD); setRetention(retD); setGeo(geoD); setStockDormant(dormantD);
      setPageViews(pvD); setAccounts(accD); setWishlist(wishD);

      if (Array.isArray(slim)) setSlimOrders(slim); else if (slim != null) failed.add("commandes-data");
      if (carts?.carts && Array.isArray(carts.carts)) setAbandonedCarts(carts.carts);
      else if (Array.isArray(carts)) setAbandonedCarts(carts);
      else if (carts != null) failed.add("abandoned-carts");
      if (news?.subscribers && Array.isArray(news.subscribers)) setNewsletter(news.subscribers);
      else if (Array.isArray(news)) setNewsletter(news);
      else if (news != null) failed.add("newsletter");
      if (Array.isArray(revs)) setReviews(revs); else if (revs != null) failed.add("reviews");
      if (Array.isArray(alerts)) setStockAlerts(alerts);
      else if (alerts?.data && Array.isArray(alerts.data)) setStockAlerts(alerts.data);
      else if (alerts != null) failed.add("stock-alerts");

      setFailedEndpoints([...failed]);
      setServerError(errorMsgs.size ? [...errorMsgs][0] : null); // 1 message suffit (bornes identiques → même 400 partout)
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, excludeBots, mode, dayStr, rangeFrom, rangeTo, weekday, wdDepth]);

  // Chargement initial + à chaque changement de période + auto-refresh 5 min.
  useEffect(() => {
    load();
    const t = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [load]);

  // G-3a — charge le jour de RÉFÉRENCE (headline uniquement) quand une comparaison
  // est active. Même toggle bots que le terme principal (comparaison à réglages
  // identiques). Cleared dès qu'on quitte le mode jour ou qu'on efface la 2e date.
  useEffect(() => {
    if (mode !== "day" || !dayStr || !compareDate) { setCmp(null); return; }
    let cancelled = false;
    const bots = excludeBots ? "exclude" : "all";
    const g = async (u: string): Promise<any> => {
      try { const r = await adminFetch(u); if (!r.ok) return null; const j = await r.json(); return j.error ? null : (j.data ?? null); }
      catch { return null; }
    };
    (async () => {
      const [pvC, kpiC, convC] = await Promise.all([
        g(`/api/admin/page-views?date=${compareDate}&bots=${bots}`),
        g(`/api/admin/analytics/kpis?date=${compareDate}`),
        g(`/api/admin/analytics/conversion?date=${compareDate}&bots=${bots}`),
      ]);
      if (!cancelled) setCmp({ pv: pvC, kpis: kpiC, conversion: convC });
    })();
    return () => { cancelled = true; };
  }, [mode, dayStr, compareDate, excludeBots]);

  // G-3b — occurrences du jour de semaine sélectionné (ordre chronologique).
  const wdOccs = useMemo(() => (mode === "weekday" ? weekdayOccurrences(weekday, wdDepth) : []), [mode, weekday, wdDepth]);

  const todayStr = useMemo(() => todayYmd(), []);

  // Applique une plage en corrigeant « au » < « du » : on ÉCHANGE les deux dates
  // (préserve les deux choix de l'utilisateur, jamais de requête vouée au 400).
  function applyRange(nf: string, nt: string) {
    let a = nf, b = nt;
    if (a && b && a > b) { const t = a; a = b; b = t; }
    setRangeFrom(a); setRangeTo(b);
    if (a && b) { setDayStr(""); setCompareDate(""); setMode("range"); } // plage complète → mode range (exclusif)
    else setMode("period");                                             // incomplète/vidée → retour période
  }

  // Libellé d'en-tête selon le mode actif (français lisible).
  const periodLabel =
    mode === "day" && dayStr && compareDate  ? `${fmtDayShort(dayStr)} vs ${fmtDayShort(compareDate)}${compareDate === shiftYmd(dayStr, -7) ? " (S-1)" : ""}` :
    mode === "day"   && dayStr               ? `le ${fmtLongDay(dayStr)}` :
    mode === "range" && rangeFrom && rangeTo  ? fmtRangeLabel(rangeFrom, rangeTo) :
    mode === "weekday"                        ? `tous les ${WEEKDAY_LONG[weekday]}s · ${wdDepth} dernières occurrences` :
    period === "all" ? "depuis le début" : `sur les ${period} derniers jours`;
  // Deltas : période glissante (sauf « all ») OU fenêtre calendaire (fromPrev calculé par l'API G-1).
  const showDelta   = mode === "period" ? period !== "all" : true;

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
      <div style={{ padding: narrow ? "20px 12px" : "36px 40px", background: C.bg, minHeight: "100vh" }}>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: narrow ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fit, minmax(200px,1fr))" }}>
          {[0, 1, 2, 3].map(i => <Skeleton key={i} h={110} />)}
        </div>
      </div>
    );
  }

  // ── Dérivés trafic (ex-TrafficSection, désormais inline pour la réorg 5 sections) ──
  const pv = pageViews;
  const th = { padding: "8px 10px", fontWeight: 700, textAlign: "left" as const };
  const td = { padding: "9px 10px" };
  const channelDonut = (pv?.by_channel ?? []).map((c: any) => ({ label: CHANNEL_LABELS_FR[c.channel] ?? c.channel, value: c.sessions, color: CHANNEL_COLORS[c.channel] ?? "#94a3b8" }));
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
    <div style={{ padding: narrow ? "20px 12px" : "36px 40px", background: C.bg, minHeight: "100vh" }}>

      {/* ── EN-TÊTE (titre — défile normalement) ── */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 950, letterSpacing: -1, color: C.warm }}>Statistiques</h1>
        <div style={{ fontSize: 14, color: C.muted, marginTop: 6 }}>
          Tableau de bord complet M!LK · données {periodLabel}
        </div>
      </div>

      {/* ── BARRE STICKY : contrôles + sélecteur de période (une seule période/page) ──
          top = --admin-header-h (hauteur réelle du header admin, mesurée par
          AdminShell) → calage pile dessous sans trou ni chevauchement, même quand
          le header wrappe sur mobile. Fond opaque #0d0b09 + marges négatives pour
          couvrir toute la largeur (rien ne défile visible dessous). flexWrap → mobile OK.
          Le sticky ne marche que parce que globals.css utilise overflow-x:clip (pas hidden). */}
      <div style={{
        position: "sticky", top: "var(--admin-header-h, 78px)", zIndex: 30,
        // Marges négatives (bord-à-bord) SEULEMENT en desktop. En mobile on les
        // retire : le padding conteneur change et un -40px déborderait à droite.
        background: C.bg, margin: narrow ? "0 0 18px" : "0 -40px 24px", padding: narrow ? "10px 0" : "12px 40px",
        borderBottom: `1px solid ${C.faint}`, boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
        display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, flexWrap: "wrap",
      }}>
        {lastUpdated && (
          <span style={{ fontSize: 12, color: C.muted, whiteSpace: "nowrap", marginRight: "auto" }}>
            Maj {lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
        <button onClick={() => setExcludeBots(v => !v)} title="Exclure les sessions détectées comme bots (heuristique : rebond instantané + scroll 0 + crawlers connus). S'applique au trafic (page_views)."
          style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${excludeBots ? C.amber : C.faint}`, background: excludeBots ? "rgba(196,154,74,0.15)" : C.card, color: excludeBots ? C.amber : C.muted, fontWeight: 800, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
          {excludeBots ? "🤖 Bots exclus" : "🤖 Exclure bots"}
        </button>
        <button onClick={load} disabled={refreshing} title="Rafraîchir maintenant"
          style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${C.faint}`, background: C.card, color: C.warm, fontWeight: 800, fontSize: 13, cursor: refreshing ? "wait" : "pointer", opacity: refreshing ? 0.6 : 1, whiteSpace: "nowrap" }}>
          {refreshing ? "⟳ …" : "⟳ Rafraîchir"}
        </button>
        <div style={{ display: "flex", gap: 6, background: C.card, borderRadius: 12, padding: 4, border: `1px solid ${mode === "period" ? C.faint : C.faint}`, opacity: mode === "period" ? 1 : 0.85 }}>
          {PERIODS.map(p => {
            const on = mode === "period" && period === p.key;
            return (
              <button key={p.key}
                onClick={() => { setPeriod(p.key); setMode("period"); setDayStr(""); setRangeFrom(""); setRangeTo(""); setCompareDate(""); }}
                style={{ padding: "8px 16px", borderRadius: 9, border: "none", cursor: "pointer", minHeight: 44, background: on ? C.warm : "transparent", color: on ? "#000" : C.muted, fontWeight: 800, fontSize: 13, transition: "all 0.15s" }}>
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Sélecteur calendaire (Lot G-2) — jour précis OU plage. Champs natifs
            <input type=date>. Bordure ambre = mode actif. flexWrap → empile en 390px. */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", background: C.card, borderRadius: 12, padding: "4px 10px", border: `1px solid ${mode !== "period" ? C.amber : C.faint}` }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: mode === "day" ? C.amber : C.muted, fontWeight: 800 }}>
            Jour
            <input type="date" value={mode === "day" ? dayStr : ""} min={DATA_MIN_DATE} max={todayStr}
              onChange={e => { const v = e.target.value; if (!v) { setDayStr(""); setMode("period"); return; } setDayStr(v); setRangeFrom(""); setRangeTo(""); setMode("day"); }}
              style={dateInputStyle(mode === "day")} />
          </label>
          <span style={{ fontSize: 11, color: C.muted }}>ou</span>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: mode === "range" ? C.amber : C.muted, fontWeight: 800 }}>
            Du
            <input type="date" value={rangeFrom} min={DATA_MIN_DATE} max={todayStr}
              onChange={e => applyRange(e.target.value, rangeTo)} style={dateInputStyle(mode === "range")} />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: mode === "range" ? C.amber : C.muted, fontWeight: 800 }}>
            au
            <input type="date" value={rangeTo} min={rangeFrom || DATA_MIN_DATE} max={todayStr}
              onChange={e => applyRange(rangeFrom, e.target.value)} style={dateInputStyle(mode === "range")} />
          </label>
        </div>

        {/* G-3a — comparaison de 2 jours (visible en mode jour). Bordure ambre = comparaison active. */}
        {mode === "day" && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", background: C.card, borderRadius: 12, padding: "4px 10px", border: `1px solid ${compareDate ? C.amber : C.faint}` }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: compareDate ? C.amber : C.muted, fontWeight: 800 }}>
              comparer à
              <input type="date" value={compareDate} min={DATA_MIN_DATE} max={todayStr}
                onChange={e => setCompareDate(e.target.value)} style={dateInputStyle(!!compareDate)} />
            </label>
            <button onClick={() => dayStr && setCompareDate(shiftYmd(dayStr, -1))} title="Comparer au jour précédent (J-1)"
              style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.faint}`, background: "transparent", color: C.muted, fontWeight: 800, fontSize: 12, cursor: "pointer", minHeight: 44 }}>jour préc.</button>
            <button onClick={() => dayStr && setCompareDate(shiftYmd(dayStr, -7))} title="Comparer au même jour de la semaine précédente (J-7)"
              style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.faint}`, background: "transparent", color: C.muted, fontWeight: 800, fontSize: 12, cursor: "pointer", minHeight: 44 }}>même jour, S-1</button>
            {compareDate && (
              <button onClick={() => setCompareDate("")} title="Retirer la comparaison"
                style={{ padding: "8px 10px", borderRadius: 8, border: "none", background: "transparent", color: C.muted, fontWeight: 800, fontSize: 14, cursor: "pointer", minHeight: 44 }}>✕</button>
            )}
          </div>
        )}

        {/* G-3b — agrégat « tous les <jour> ». Sélection = 4e mode calendaire. */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", background: C.card, borderRadius: 12, padding: "4px 10px", border: `1px solid ${mode === "weekday" ? C.amber : C.faint}` }}>
          <span style={{ fontSize: 12, color: mode === "weekday" ? C.amber : C.muted, fontWeight: 800 }}>tous les</span>
          <select value={weekday} onChange={e => { setWeekday(Number(e.target.value)); setMode("weekday"); setDayStr(""); setRangeFrom(""); setRangeTo(""); setCompareDate(""); }}
            style={selectStyle(mode === "weekday")}>
            {WEEKDAY_LONG.map((w, i) => <option key={i} value={i}>{w}s</option>)}
          </select>
          <select value={wdDepth} onChange={e => { setWdDepth(Number(e.target.value)); setMode("weekday"); setDayStr(""); setRangeFrom(""); setRangeTo(""); setCompareDate(""); }}
            style={selectStyle(mode === "weekday")}>
            {[4, 8, 12].map(n => <option key={n} value={n}>{n} occ.</option>)}
          </select>
        </div>
      </div>

      {/* Erreur API explicite (ex. 400 bornes invalides, Lot G-1) — jamais muette (leçon Lot N). */}
      {serverError && (
        <div style={{ marginBottom: 20, padding: "14px 20px", borderRadius: 12, background: "rgba(239,68,68,0.12)", border: `1px solid rgba(239,68,68,0.45)`, color: C.red, fontSize: 14, fontWeight: 800 }}>
          ⛔ {serverError}
        </div>
      )}

      {/* Échecs réseau/serveur (masqué si un message d'erreur explicite est déjà affiché). */}
      {failedEndpoints.length > 0 && !serverError && (
        <div style={{ marginBottom: 28, padding: "14px 20px", borderRadius: 12, background: "rgba(217,93,77,0.10)", border: `1px solid rgba(217,93,77,0.28)`, color: C.red, fontSize: 13, fontWeight: 700 }}>
          ⚠️ Données incomplètes sur : [{failedEndpoints.join(", ")}]
        </div>
      )}

      {/* Fenêtre valide mais aucun trafic — message explicite plutôt que des graphes vides muets. */}
      {!loading && !serverError && pv && (pv.total_views ?? 0) === 0 && (
        <div style={{ marginBottom: 20, padding: "14px 20px", borderRadius: 12, background: "rgba(196,154,74,0.10)", border: `1px solid rgba(196,154,74,0.3)`, color: C.amber, fontSize: 14, fontWeight: 700 }}>
          Aucune donnée de trafic {periodLabel}. Essaie une autre date ou une période plus large.
        </div>
      )}

      {/* ══════════════ G-3a · COMPARAISON JOUR vs JOUR ══════════════ */}
      {mode === "day" && compareDate && (
        <div style={{ marginBottom: 24, background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.faint}` }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.warm, marginBottom: 4 }}>
            ⚖️ {fmtDayShort(dayStr)} vs {fmtDayShort(compareDate)}{compareDate === shiftYmd(dayStr, -7) ? " (même jour, S-1)" : ""}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
            Réglage « {excludeBots ? "bots exclus" : "tous visiteurs"} » appliqué aux deux jours.
            {((cmp?.pv?.unique_sessions ?? 0) < 20 || (pv?.unique_sessions ?? 0) < 20) && <span style={{ color: C.amber }}> · ⚠️ faible volume : écarts % à interpréter avec prudence.</span>}
          </div>
          {!cmp ? <Skeleton h={120} /> : (
            <div style={{ display: "grid", gap: 8 }}>
              {!narrow && (
                <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 10, fontSize: 11, color: C.muted, fontWeight: 800, textTransform: "uppercase" as const }}>
                  <span>Métrique</span><span>{fmtDayShort(dayStr)}</span><span>{fmtDayShort(compareDate)}</span><span>Écart</span>
                </div>
              )}
              {[
                { label: "Sessions",           better: "up" as const,   sel: pv?.unique_sessions ?? 0,        ref: cmp?.pv?.unique_sessions ?? 0,        fmt: (v: number) => String(v) },
                { label: "Vues",               better: "up" as const,   sel: pv?.total_views ?? 0,            ref: cmp?.pv?.total_views ?? 0,            fmt: (v: number) => String(v) },
                { label: "Chiffre d'affaires", better: "up" as const,   sel: kpis?.revenue ?? 0,              ref: cmp?.kpis?.revenue ?? 0,              fmt: (v: number) => eur(v) },
                { label: "Commandes",          better: "up" as const,   sel: kpis?.orders_count ?? 0,         ref: cmp?.kpis?.orders_count ?? 0,         fmt: (v: number) => String(v) },
                { label: "Taux de conversion", better: "up" as const,   sel: conversion?.conversion_rate ?? 0, ref: cmp?.conversion?.conversion_rate ?? 0, fmt: (v: number) => v.toFixed(2) + "%" },
                { label: "Taux de rebond",     better: "down" as const, sel: pv?.bounce_rate ?? 0,            ref: cmp?.pv?.bounce_rate ?? 0,            fmt: (v: number) => `${v}%` },
              ].map(m => {
                const lowVol = (cmp?.pv?.unique_sessions ?? 0) < 20 || (pv?.unique_sessions ?? 0) < 20;
                return (
                  <div key={m.label} style={{ display: "grid", gridTemplateColumns: narrow ? "1fr 1fr" : "1.4fr 1fr 1fr 1fr", gap: 10, alignItems: "center", borderTop: `1px solid ${C.faint}`, paddingTop: 8, fontSize: 13 }}>
                    <span style={{ color: C.warm, fontWeight: 700 }}>{m.label}</span>
                    <span style={{ color: C.warm }}>{narrow && <span style={{ color: C.muted, fontSize: 11 }}>{fmtDayShort(dayStr)} · </span>}{m.fmt(m.sel)}</span>
                    <span style={{ color: C.muted }}>{narrow && <span style={{ color: C.muted, fontSize: 11 }}>{fmtDayShort(compareDate)} · </span>}{m.fmt(m.ref)}</span>
                    <span style={{ gridColumn: narrow ? "1 / -1" : "auto" }}><DeltaBadge d={pctDelta(m.sel, m.ref)} better={m.better} lowVol={lowVol} /></span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════ G-3b · AGRÉGAT « TOUS LES <JOUR> » ══════════════ */}
      {mode === "weekday" && (
        <>
          <div style={{ marginBottom: 16, padding: "12px 18px", borderRadius: 12, background: "rgba(196,154,74,0.10)", border: `1px solid rgba(196,154,74,0.3)`, color: C.amber, fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>
            📆 « Tous les {WEEKDAY_LONG[weekday]}s » : le détail par occurrence ci-dessous porte sur le <b>trafic</b> (sessions/vues) — seule métrique ventilée par jour. Les autres blocs du tableau de bord couvrent la <b>plage entière</b>{wdOccs.length ? ` du ${fmtDayShort(wdOccs[0])} au ${fmtDayShort(wdOccs[wdOccs.length - 1])}` : ""} (contiguë), pas uniquement les {WEEKDAY_LONG[weekday]}s.
          </div>
          <div style={{ marginBottom: 24 }}>
            <Card title={`📆 Tous les ${WEEKDAY_LONG[weekday]}s — ${wdDepth} dernières occurrences`}>
              {(() => {
                const occSet = new Set(wdOccs);
                const occRows = (pv?.by_day ?? []).filter((d: any) => occSet.has(d.date));
                if (occRows.length === 0) return <div style={{ color: C.muted, fontSize: 13 }}>Aucune donnée de trafic sur ces journées (période antérieure au tracking ?).</div>;
                const totSess  = occRows.reduce((s: number, d: any) => s + (d.sessions || 0), 0);
                const totViews = occRows.reduce((s: number, d: any) => s + (d.views || 0), 0);
                return (
                  <>
                    <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginBottom: 14 }}>
                      <div><div style={{ fontSize: 22, fontWeight: 950, color: C.purple }}>{totSess}</div><div style={{ fontSize: 11, color: C.muted }}>sessions cumulées</div></div>
                      <div><div style={{ fontSize: 22, fontWeight: 950, color: C.blue }}>{totViews}</div><div style={{ fontSize: 11, color: C.muted }}>vues cumulées</div></div>
                      <div><div style={{ fontSize: 22, fontWeight: 950, color: C.warm }}>{Math.round(totSess / occRows.length)}</div><div style={{ fontSize: 11, color: C.muted }}>sessions / {WEEKDAY_LONG[weekday]} (moy.)</div></div>
                    </div>
                    <LineChart data={occRows.map((d: any) => ({ label: `${String(d.date).slice(8)}/${String(d.date).slice(5, 7)}`, value: d.sessions }))} color={C.purple} height={160} />
                    <div style={{ overflowX: "auto", marginTop: 12 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead><tr style={{ color: C.muted }}><th style={th}>Date</th><th style={th}>Sessions</th><th style={th}>Vues</th></tr></thead>
                        <tbody>
                          {occRows.map((d: any) => (
                            <tr key={d.date} style={{ borderTop: `1px solid ${C.faint}` }}>
                              <td style={{ ...td, color: C.warm }}>{fmtDayShort(d.date)}</td>
                              <td style={{ ...td, color: C.amber, fontWeight: 700 }}>{d.sessions}</td>
                              <td style={{ ...td, color: C.muted }}>{d.views}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}
            </Card>
          </div>
        </>
      )}

      {/* ══════════════ 1 · ACQUISITION ══════════════ */}
      <SectionTitle>1 · Acquisition</SectionTitle>

      {pv?.bots_filter_active && (
        <div style={{ marginBottom: 16, padding: "8px 14px", borderRadius: 8, background: "rgba(196,154,74,0.1)", border: `1px solid rgba(196,154,74,0.25)`, color: C.amber, fontSize: 12, fontWeight: 700 }}>
          🤖 Filtre bots actif (heuristique) — {pv.bots_excluded} session(s) exclue(s). Filtre 100 % fiable dès que le user-agent sera capté (colonne page_views.user_agent).
        </div>
      )}

      {!pv ? (
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: narrow ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fit, minmax(180px,1fr))", marginBottom: 24 }}>
          {[0, 1, 2, 3, 4, 5].map(i => <Skeleton key={i} h={110} />)}
        </div>
      ) : (
        <>
          {/* KPIs trafic */}
          <div style={{ display: "grid", gridTemplateColumns: narrow ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
            <KpiCard label="Vues totales"      value={String(pv.total_views ?? 0)}     color={C.blue}   delta={showDelta ? pv.deltas?.views : undefined} />
            <KpiCard label="Sessions uniques"  value={String(pv.unique_sessions ?? 0)} color={C.purple} delta={showDelta ? pv.deltas?.sessions : undefined} />
            <KpiCard label="Visiteurs uniques" value={String(pv.unique_visitors ?? 0)} delta={showDelta ? pv.deltas?.visitors : undefined} />
            <KpiCard label="Durée moyenne"     value={fmtDur(pv.avg_time_on_page)} color={C.green}
                     delta={showDelta ? pv.deltas?.avg_time : undefined}
                     pending={pv.avg_time_on_page == null || pv.avg_time_on_page === 0}
                     title="Ces données se remplissent après les premières navigations complètes" />
            <KpiCard label="Taux de rebond"    value={pv.bounce_rate == null ? "—" : `${pv.bounce_rate}%`}
                     pending={pv.bounce_rate == null || pv.bounce_rate === 0}
                     title="Ces données se remplissent après les premières navigations complètes" />
            <KpiCard label="Pages / session"   value={Number(pv.pages_per_session ?? 0).toFixed(1)} />
          </div>

          {/* Sources de trafic + Campagnes UTM */}
          <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <Card title="📡 Sources de trafic" lexique="Canal">
              <DonutChart data={channelDonut} />
              {(pv.by_channel ?? []).length > 0 && (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 14 }}>
                  <thead><tr style={{ color: C.muted }}><th style={th}>Canal</th><th style={th}>Sessions</th><th style={th}>%</th></tr></thead>
                  <tbody>
                    {pv.by_channel.map((c: any) => (
                      <tr key={c.channel} style={{ borderTop: `1px solid ${C.faint}` }}>
                        <td style={td}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: CHANNEL_COLORS[c.channel] ?? "#94a3b8", marginRight: 8 }} />{CHANNEL_LABELS_FR[c.channel] ?? c.channel}</td>
                        <td style={{ ...td, color: C.warm, fontWeight: 700 }}>{c.sessions}</td>
                        <td style={{ ...td, color: C.muted }}>{c.pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
            <Card title="🎯 Campagnes UTM">
              {(pv.top_campaigns ?? []).length === 0 ? <div style={{ color: C.muted, fontSize: 13 }}>Aucune campagne UTM trackée.</div> : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead><tr style={{ color: C.muted }}><th style={th}>Campagne</th><th style={th}>Source</th><th style={th}>Sessions</th></tr></thead>
                    <tbody>
                      {pv.top_campaigns.map((c: any, i: number) => (
                        <tr key={c.campaign + i} style={{ borderTop: `1px solid ${C.faint}` }}>
                          <td style={{ ...td, color: C.warm }}>{c.campaign}</td>
                          <td style={{ ...td, color: C.muted }}>{c.source}</td>
                          <td style={{ ...td, color: C.amber, fontWeight: 700 }}>{c.sessions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          {/* Pages d'entrée + Top référents */}
          <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <Card title="🛬 Pages d'entrée (landing)" lexique="Pages d'entrée">
              {(pv.entry_pages ?? []).length === 0 ? <div style={{ color: C.muted, fontSize: 13 }}>Aucune page d'entrée trackée.</div> : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead><tr style={{ color: C.muted }}><th style={th}>Page d'entrée</th><th style={th}>Sessions</th><th style={th}>Rebond</th></tr></thead>
                    <tbody>
                      {pv.entry_pages.map((e: any) => (
                        <tr key={e.entry_page} style={{ borderTop: `1px solid ${C.faint}` }}>
                          <td style={{ ...td, color: C.warm }}>{e.entry_page}</td>
                          <td style={{ ...td, color: C.amber, fontWeight: 700 }}>{e.sessions}</td>
                          <td style={{ ...td, color: C.muted }}>{e.bounce_rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
            <Card title="🔗 Top référents">
              {(pv.top_referrers ?? []).length === 0 ? <div style={{ color: C.muted, fontSize: 13 }}>Aucun référent externe.</div> : (
                <div style={{ display: "grid", gap: 8 }}>
                  {pv.top_referrers.map((r: any) => (
                    <div key={r.domain} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: C.warm }}>{r.domain}</span><span style={{ color: C.amber, fontWeight: 700 }}>{r.sessions}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Heatmap croisée : trafic par heure × jour, coloré par canal dominant */}
          <div style={{ marginBottom: 24 }}>
            <Card title="🗓️ Trafic par heure × jour (canal dominant)" lexique="Canal">
              <TrafficHeatmap cells={pv.traffic_heatmap ?? []} />
            </Card>
          </div>

          {/* Vues par jour (courbe) + Évolution des sessions */}
          <div style={{ marginBottom: 24 }}>
            <Card title="📈 Vues par jour" lexique="Vues totales">
              <LineChart data={(pv.by_day ?? []).map((d: any) => ({ label: String(d.date).slice(5), value: d.views }))} color={C.blue} />
              <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>
                Sessions uniques sur la période : <span style={{ color: C.warm, fontWeight: 700 }}>{pv.unique_sessions ?? 0}</span>
              </div>
            </Card>
          </div>
          <div style={{ marginBottom: 24 }}>
            <Card title="📉 Évolution des sessions" lexique="Sessions uniques">
              <SessionsLineChart byDay={pv.by_day ?? []} />
            </Card>
          </div>

          {/* Trafic par heure / par jour — distributions (barres conservées) */}
          <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <Card title="🕐 Trafic par heure (heure Paris)">
              <BarChart data={(pv.by_hour ?? []).map((h: any) => ({ label: h.hour % 4 === 0 ? `${h.hour}h` : "", value: h.views }))} height={120} />
            </Card>
            <Card title="📅 Trafic par jour">
              <BarChart data={(pv.by_weekday ?? []).map((d: any) => ({ label: WEEKDAYS[d.day] ?? String(d.day), value: d.views }))} height={120} />
            </Card>
          </div>
        </>
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
                « Checkout » = event <b>begin_checkout</b> (clic « Passer au paiement » / « Commander », panier non vide) — plus de proxy page vue. « Achat » = commandes valides de la période (pas de session_id sur les commandes → comparaison indicative). Les begin_checkout n'existent qu'à partir du déploiement de ce suivi : l'étape peut être basse tant que la donnée s'accumule.
              </div>
            </>
          )}
        </Card>
        <Card title="🛒 Paniers abandonnés" lexique="Paniers abandonnés">
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginBottom: 12 }}>
            <div><div style={{ fontSize: 22, fontWeight: 950, color: C.warm }}>{cartsStats.total}</div><div style={{ fontSize: 11, color: C.muted }}>paniers</div></div>
            <div><div style={{ fontSize: 22, fontWeight: 950, color: C.green }}>{cartsStats.converted}</div><div style={{ fontSize: 11, color: C.muted }}>récupérés</div></div>
            <div><div style={{ fontSize: 22, fontWeight: 950, color: C.amber }}>{cartsStats.recovery.toFixed(0)}%</div><div style={{ fontSize: 11, color: C.muted }}>taux de récupération</div></div>
          </div>
          <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
            C'est ici que le tunnel décroche : panier rempli, pas de paiement. Séquence de relance email automatique 1h / 24h / 72h.
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

          {/* Profondeur de scroll + Durée de visite (distributions — barres conservées) */}
          <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <Card title="🖱️ Profondeur de scroll" lexique="Scroll depth">
              {(pv.scroll_distribution ?? []).every((d: any) => !d.count)
                ? <BehaviorPlaceholder />
                : <HBars data={pv.scroll_distribution.map((d: any) => ({ label: d.bucket, value: d.count }))} color={C.blue} />}
            </Card>
            <Card title="⏱️ Durée de visite" lexique="Durée moyenne">
              {(pv.time_distribution ?? []).every((d: any) => !d.count)
                ? <BehaviorPlaceholder />
                : <HBars data={pv.time_distribution.map((d: any) => ({ label: d.bucket, value: d.count }))} color={C.green} />}
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

          {/* Carte des visiteurs */}
          <div style={{ marginBottom: 24 }}>
            <Card title="🗺️ Carte des visiteurs">
              <WorldVisitorsMap cities={pv.by_city ?? []} />
            </Card>
          </div>

          {/* Appareils / Système / Navigateur */}
          <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
            <Card title="📱 Appareils">
              <div style={{ display: "grid", gap: 8 }}>
                {(pv.by_device ?? []).length === 0 ? <div style={{ color: C.muted, fontSize: 13 }}>—</div> :
                  pv.by_device.map((d: any) => (
                    <div key={d.device_type} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: C.warm }}>{DEVICE_ICON[d.device_type] ?? "•"} {d.device_type}</span>
                      <span style={{ color: C.amber, fontWeight: 700 }}>{d.sessions} · {d.pct}%</span>
                    </div>
                  ))}
              </div>
            </Card>
            <Card title="💿 Système">
              <div style={{ display: "grid", gap: 8 }}>
                {(pv.by_os ?? []).length === 0 ? <div style={{ color: C.muted, fontSize: 13 }}>—</div> :
                  pv.by_os.map((d: any) => (
                    <div key={d.os} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: C.warm }}>{d.os}</span><span style={{ color: C.amber, fontWeight: 700 }}>{d.sessions}</span>
                    </div>
                  ))}
              </div>
            </Card>
            <Card title="🌐 Navigateur">
              <div style={{ display: "grid", gap: 8 }}>
                {(pv.by_browser ?? []).length === 0 ? <div style={{ color: C.muted, fontSize: 13 }}>—</div> :
                  pv.by_browser.map((d: any) => (
                    <div key={d.browser} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: C.warm }}>{d.browser}</span><span style={{ color: C.amber, fontWeight: 700 }}>{d.sessions}</span>
                    </div>
                  ))}
              </div>
            </Card>
          </div>
        </>
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

      {/* ══════════════ 4 · CLIENTS & FIDÉLITÉ ══════════════ */}
      <SectionTitle>4 · Clients &amp; fidélité</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
        {/* Toujours rendue (jamais gated sur `accounts`) → ne peut plus « disparaître »
            en skeleton perpétuel si la route est lente/échoue ; le sous-titre affiche le
            TOTAL all-time même quand le compte de la période vaut 0. */}
        <KpiCard label="Comptes créés" value={String(accounts?.count ?? 0)}
          sub={accounts ? `${accounts.total ?? 0} compte(s) au total` : "inscriptions sur la période"}
          color={C.blue} delta={showDelta ? accounts?.delta_pct : undefined}
          href="/admin/comptes" actionLabel="Voir les comptes →" />
        {kpis
          ? <KpiCard label="Clients uniques" value={String(kpis.unique_customers)} sub={`${kpis.orders_count} commande(s)`} delta={showDelta ? kpis.orders_delta_pct : undefined} deltaLabel="commandes vs préc." />
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
