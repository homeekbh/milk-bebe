import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import { resolveAnalyticsRange, fetchAllPaged, botSessionIds, toParis, parisDayKey, enumerateParisDays } from "@/lib/analytics-server";
import { isValidOrder, getNetAmount } from "@/lib/orders";
import * as Sentry from "@sentry/nextjs";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/analytics/series (Lot A5 · métriques étendues A8.2)
 * Série temporelle + comparaison, à granularité hour|day|month, pour les métriques
 * demandées via ?m=sessions,add_to_cart,revenue (défaut : sessions,visitors,views).
 *
 * Sources :
 *   page_views      → sessions (session_id distinct), visitors (visitor_id distinct), views (lignes)
 *   analytics_events→ product_views (view_item), add_to_cart, begin_checkout, purchases (purchase)
 *   orders          → revenue (Σ getNetAmount des commandes VALIDES), orders (nb valides)
 *   profiles        → new_accounts (created_at)
 *   newsletter_subscribers → newsletter (created_at)
 *
 * Filtre bots : appliqué à page_views ET analytics_events (via botSessionIds calculé
 * sur page_views, puis exclusion des events dont le session_id est bot). PAS aux orders
 * (une commande reste une commande). revenue/orders réutilisent isValidOrder + getNetAmount
 * (mêmes helpers que /api/admin/home et les KPIs → une seule vérité).
 * Points vides à 0 (jamais de trou). Troncature identique au Lot A5 (compare_truncated).
 */

type Gran = "hour" | "day" | "month";

const METRIC_SRC: Record<string, "pv" | "ae" | "ord" | "prof" | "nl"> = {
  sessions: "pv", visitors: "pv", views: "pv",
  product_views: "ae", add_to_cart: "ae", begin_checkout: "ae", purchases: "ae",
  revenue: "ord", orders: "ord",
  new_accounts: "prof", newsletter: "nl",
};
const EVENT_OF: Record<string, string> = { product_views: "view_item", add_to_cart: "add_to_cart", begin_checkout: "begin_checkout", purchases: "purchase" };

const hourKeysBetween = (fromISO: string, toISO: string, maxKey?: string): string[] => {
  const keys: string[] = [];
  for (const day of enumerateParisDays(fromISO, toISO)) {
    for (let h = 0; h < 24; h++) {
      const k = `${day}T${String(h).padStart(2, "0")}`;
      if (maxKey && k > maxKey) return keys;
      keys.push(k);
    }
  }
  return keys;
};
const monthKeysBetween = (fromISO: string, toISO: string): string[] => {
  const keys: string[] = [];
  let [y, m] = parisDayKey(fromISO).slice(0, 7).split("-").map(Number);
  const end = parisDayKey(toISO).slice(0, 7);
  for (let g = 0; g < 600; g++) {
    const k = `${y}-${String(m).padStart(2, "0")}`;
    keys.push(k);
    if (k === end) break;
    m++; if (m > 12) { m = 1; y++; }
  }
  return keys;
};
const bucketKey = (v: string, g: Gran): string => {
  if (g === "hour")  return `${parisDayKey(v)}T${String(toParis(v).getHours()).padStart(2, "0")}`;
  if (g === "month") return parisDayKey(v).slice(0, 7);
  return parisDayKey(v);
};

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const sp = new URL(req.url).searchParams;
    const from = sp.get("from") ?? "", to = sp.get("to") ?? "";
    const cfrom = sp.get("cfrom") ?? "", cto = sp.get("cto") ?? "";
    const gRaw = sp.get("g") ?? "day";
    const g: Gran = gRaw === "hour" || gRaw === "month" ? gRaw : "day";
    const excludeBots = sp.get("bots") === "exclude";

    const requested = (sp.get("m") ?? "sessions,visitors,views").split(",").map(s => s.trim()).filter(m => METRIC_SRC[m]);
    const metrics = requested.length ? [...new Set(requested)] : ["sessions", "visitors", "views"];
    const need = (src: string) => metrics.some(m => METRIC_SRC[m] === src);
    const pvNeeded = need("pv"), aeNeeded = need("ae"), ordNeeded = need("ord"), profNeeded = need("prof"), nlNeeded = need("nl");
    const pvForBots = excludeBots && (pvNeeded || aeNeeded); // page_views nécessaire au calcul du botSet

    const mainR = resolveAnalyticsRange(new URLSearchParams({ from, to }));
    if (!mainR.ok) return Response.json({ data: null, error: mainR.error }, { status: 400 });
    const cmpR = resolveAnalyticsRange(new URLSearchParams({ from: cfrom, to: cto }));
    if (!cmpR.ok) return Response.json({ data: null, error: cmpR.error }, { status: 400 });

    const paged = (table: string, cols: string, dateCol: string, fromISO: string, toISO: string) =>
      fetchAllPaged<any>((rf, rt) => supabaseServer.from(table).select(cols).gte(dateCol, fromISO).lte(dateCol, toISO).order(dateCol, { ascending: true }).range(rf, rt));

    // Fetch des sources nécessaires (main + compare).
    const F = mainR.range, Cr = cmpR.range;
    let pvMain: any[] = [], pvCmp: any[] = [], aeMain: any[] = [], aeCmp: any[] = [], ordMain: any[] = [], ordCmp: any[] = [], profMain: any[] = [], profCmp: any[] = [], nlMain: any[] = [], nlCmp: any[] = [];
    if (pvNeeded || pvForBots) { [pvMain, pvCmp] = await Promise.all([paged("page_views", "*", "viewed_at", F.from, F.to), paged("page_views", "*", "viewed_at", Cr.from, Cr.to)]); }
    if (aeNeeded)  { [aeMain, aeCmp]   = await Promise.all([paged("analytics_events", "event_type, session_id, created_at", "created_at", F.from, F.to), paged("analytics_events", "event_type, session_id, created_at", "created_at", Cr.from, Cr.to)]); }
    if (ordNeeded) { [ordMain, ordCmp] = await Promise.all([paged("orders", "*", "created_at", F.from, F.to), paged("orders", "*", "created_at", Cr.from, Cr.to)]); }
    if (profNeeded){ [profMain, profCmp] = await Promise.all([paged("profiles", "created_at", "created_at", F.from, F.to), paged("profiles", "created_at", "created_at", Cr.from, Cr.to)]); }
    if (nlNeeded)  { [nlMain, nlCmp]   = await Promise.all([paged("newsletter_subscribers", "created_at", "created_at", F.from, F.to), paged("newsletter_subscribers", "created_at", "created_at", Cr.from, Cr.to)]); }

    // Filtre bots (page_views + analytics_events par session_id).
    if (excludeBots && (pvNeeded || pvForBots)) {
      const bMain = botSessionIds(pvMain), bCmp = botSessionIds(pvCmp);
      pvMain = pvMain.filter(r => !r.session_id || !bMain.has(r.session_id));
      pvCmp  = pvCmp.filter(r => !r.session_id || !bCmp.has(r.session_id));
      if (aeNeeded) {
        aeMain = aeMain.filter(r => !r.session_id || !bMain.has(r.session_id));
        aeCmp  = aeCmp.filter(r => !r.session_id || !bCmp.has(r.session_id));
      }
    }

    const todayKey = parisDayKey(new Date());
    const inProgress = to === todayKey;
    const maxHourKey = inProgress && g === "hour" ? `${todayKey}T${String(toParis(new Date()).getHours()).padStart(2, "0")}` : undefined;
    const keysFor = (r: { from: string; to: string }, max?: string) => g === "hour" ? hourKeysBetween(r.from, r.to, max) : g === "month" ? monthKeysBetween(r.from, r.to) : enumerateParisDays(r.from, r.to);
    const mainKeys = keysFor(F, maxHourKey);
    const cmpKeys  = keysFor(Cr);

    // ── Valeur d'une métrique par bucket ───────────────────────────────────────
    const perBucket = (metric: string, rows: any[], keys: string[]): number[] => {
      const src = METRIC_SRC[metric];
      if (src === "pv") {
        const sets = new Map<string, Set<string>>(); const cnt = new Map<string, number>();
        keys.forEach(k => { sets.set(k, new Set()); cnt.set(k, 0); });
        for (const r of rows) { const k = bucketKey(r.viewed_at, g); if (!cnt.has(k)) continue;
          if (metric === "views") cnt.set(k, cnt.get(k)! + 1);
          else { const id = metric === "sessions" ? r.session_id : r.visitor_id; if (id) sets.get(k)!.add(id); } }
        return keys.map(k => metric === "views" ? cnt.get(k)! : sets.get(k)!.size);
      }
      if (src === "ae") {
        const ev = EVENT_OF[metric]; const cnt = new Map<string, number>(keys.map(k => [k, 0]));
        for (const r of rows) { if (r.event_type !== ev) continue; const k = bucketKey(r.created_at, g); if (cnt.has(k)) cnt.set(k, cnt.get(k)! + 1); }
        return keys.map(k => cnt.get(k)!);
      }
      if (src === "ord") {
        const acc = new Map<string, number>(keys.map(k => [k, 0]));
        for (const r of rows) { if (!isValidOrder(r)) continue; const k = bucketKey(r.created_at, g); if (!acc.has(k)) continue; acc.set(k, acc.get(k)! + (metric === "revenue" ? getNetAmount(r) : 1)); }
        return keys.map(k => acc.get(k)!);
      }
      // prof / nl : comptage par created_at
      const cnt = new Map<string, number>(keys.map(k => [k, 0]));
      for (const r of rows) { const k = bucketKey(r.created_at, g); if (cnt.has(k)) cnt.set(k, cnt.get(k)! + 1); }
      return keys.map(k => cnt.get(k)!);
    };
    const rowsFor = (m: string, main: boolean): any[] => {
      const s = METRIC_SRC[m];
      return s === "pv" ? (main ? pvMain : pvCmp) : s === "ae" ? (main ? aeMain : aeCmp) : s === "ord" ? (main ? ordMain : ordCmp) : s === "prof" ? (main ? profMain : profCmp) : (main ? nlMain : nlCmp);
    };
    const dateColOf = (m: string) => METRIC_SRC[m] === "pv" ? "viewed_at" : "created_at";

    const buildPoints = (keys: string[], main: boolean) => {
      const cols: Record<string, number[]> = {};
      for (const m of metrics) cols[m] = perBucket(m, rowsFor(m, main), keys);
      return keys.map((k, i) => { const o: any = { k }; for (const m of metrics) o[m] = cols[m][i]; return o; });
    };

    // Totaux d'une métrique sur un jeu de lignes.
    const totalOf = (metric: string, rows: any[]): number => {
      const src = METRIC_SRC[metric];
      if (src === "pv") { if (metric === "views") return rows.length; const set = new Set<string>(); for (const r of rows) { const id = metric === "sessions" ? r.session_id : r.visitor_id; if (id) set.add(id); } return set.size; }
      if (src === "ae") { const ev = EVENT_OF[metric]; return rows.filter(r => r.event_type === ev).length; }
      if (src === "ord") { let acc = 0; for (const r of rows) { if (!isValidOrder(r)) continue; acc += metric === "revenue" ? getNetAmount(r) : 1; } return metric === "revenue" ? Math.round(acc * 100) / 100 : acc; }
      return rows.length;
    };
    const totalsObj = (main: boolean, filter?: (r: any, m: string) => boolean) => {
      const o: any = {};
      for (const m of metrics) { const rows = filter ? rowsFor(m, main).filter(r => filter(r, m)) : rowsFor(m, main); o[m] = totalOf(m, rows); }
      return o;
    };

    const points  = buildPoints(mainKeys, true);
    const compare = buildPoints(cmpKeys, false);
    const totals         = totalsObj(true);
    const compare_totals = totalsObj(false);

    let compare_truncated: any = null;
    if (inProgress) {
      const elapsedMs = Date.now() - new Date(F.from).getTime();
      const truncEnd  = new Date(Cr.from).getTime() + elapsedMs;
      compare_truncated = totalsObj(false, (r, m) => new Date(r[dateColOf(m)]).getTime() < truncEnd);
    }

    return Response.json({
      data: { granularity: g, metrics, points, compare, totals, compare_totals, compare_truncated },
      error: null,
    });
  } catch (e: any) {
    Sentry.captureException(e, { tags: { area: "analytics" } });
    return Response.json({ data: null, error: e?.message ?? "Erreur interne" });
  }
}
