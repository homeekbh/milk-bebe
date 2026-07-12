import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import { normalizePeriod, periodRange, fetchAllPaged, VALID_STATUSES, isValidOrder, pct, botSessionIds } from "@/lib/analytics-server";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/page-views?period=7|30|90|all
 * Agrégations complètes du trafic visiteur depuis page_views (horodatage = viewed_at).
 * Tout est calculé en JS côté serveur (service-role, RLS bypass).
 */

const SOCIAL = ["instagram.com", "facebook.com", "tiktok.com", "pinterest.com", "m.facebook.com", "l.instagram.com"];

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function channelOf(r: any): string {
  const src = String(r.utm_source ?? "").toLowerCase();
  const med = String(r.utm_medium ?? "").toLowerCase();
  const dom = String(r.referrer_domain ?? "").toLowerCase();
  const hasUtm = !!src || !!med;
  if (med === "cpc" || src === "google" || src === "bing")       return "Paid Search";
  if (med === "social" || med === "paid-social")                 return "Paid Social";
  if (!hasUtm && SOCIAL.includes(dom))                           return "Organic Social";
  if (med === "email")                                           return "Email";
  if (!hasUtm && dom === "google.com")                           return "Organic Search";
  if (!r.referrer)                                               return "Direct";
  return "Referral";
}

// Heuristique bots : botSessionIds / CRAWLER_RE partagés via lib/analytics-server.ts
// (réutilisés par /api/admin/analytics/conversion).

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const sp = new URL(req.url).searchParams;
    const period = normalizePeriod(sp.get("period"));
    const excludeBots = sp.get("bots") === "exclude";
    const { from, fromPrev, to } = periodRange(period);

    // ⚠️ Pagination obligatoire : PostgREST plafonne à 1000 lignes/requête, donc
    // .limit(200000) était ignoré → seules les 1000 plus ANCIENNES lignes
    // revenaient (jours récents à 0, KPIs sous-comptés dès >1000 lignes / 30j+).
    let rows = await fetchAllPaged<any>((rf, rt) => supabaseServer
      .from("page_views")
      .select("*")
      .gte("viewed_at", from).lte("viewed_at", to)
      .order("viewed_at", { ascending: true })
      .range(rf, rt));

    // ── Filtrage bots (heuristique) si le toggle est actif ───────────────────
    const botSet = excludeBots ? botSessionIds(rows) : new Set<string>();
    const bots_excluded = botSet.size;
    if (excludeBots) rows = rows.filter(r => !r.session_id || !botSet.has(r.session_id));

    // ── KPIs ────────────────────────────────────────────────────────────────
    const sessions = new Set<string>();
    const visitors = new Set<string>();
    rows.forEach(r => { if (r.session_id) sessions.add(r.session_id); if (r.visitor_id) visitors.add(r.visitor_id); });

    const behav      = rows.filter(r => r.time_on_page != null);
    const scrolled   = rows.filter(r => r.scroll_depth != null);
    const avg_time   = behav.length    ? Math.round(mean(behav.map(r => Number(r.time_on_page))))    : null;
    const avg_scroll = scrolled.length ? Math.round(mean(scrolled.map(r => Number(r.scroll_depth)))) : null;
    const bounce_rate = behav.length ? Math.round((behav.filter(r => r.is_bounce).length / behav.length) * 100) : null;
    const pages_per_session = sessions.size > 0 ? rows.length / sessions.size : 0;

    // ── Helpers d'agrégation par clé ────────────────────────────────────────
    type Agg = { views: number; sessions: Set<string>; times: number[]; scrolls: number[]; bounces: number; bounceTot: number };
    const newAgg = (): Agg => ({ views: 0, sessions: new Set(), times: [], scrolls: [], bounces: 0, bounceTot: 0 });
    const feed = (a: Agg, r: any) => {
      a.views++;
      if (r.session_id) a.sessions.add(r.session_id);
      if (r.time_on_page != null) a.times.push(Number(r.time_on_page));
      if (r.scroll_depth != null) a.scrolls.push(Number(r.scroll_depth));
      if (r.time_on_page != null) { a.bounceTot++; if (r.is_bounce) a.bounces++; }
    };

    // ── Top pages ───────────────────────────────────────────────────────────
    const pageMap = new Map<string, Agg>();
    rows.forEach(r => {
      const p = r.page_path;
      if (!p) return;
      if (!pageMap.has(p)) pageMap.set(p, newAgg());
      feed(pageMap.get(p)!, r);
    });
    const top_pages = [...pageMap.entries()]
      .map(([page_path, a]) => ({
        page_path,
        views: a.views,
        unique_sessions: a.sessions.size,
        avg_time:   a.times.length   ? Math.round(mean(a.times))   : 0,
        avg_scroll: a.scrolls.length ? Math.round(mean(a.scrolls)) : 0,
        bounce_rate: a.bounceTot ? Math.round((a.bounces / a.bounceTot) * 100) : 0,
      }))
      .sort((x, y) => y.views - x.views)
      .slice(0, 20);

    // ── Produits vus (page_path commence par /produits/) ────────────────────
    const prodMap = new Map<string, { name: string; a: Agg }>();
    rows.forEach(r => {
      const p = r.page_path;
      if (!p || !p.startsWith("/produits/")) return;
      if (!prodMap.has(p)) prodMap.set(p, { name: r.page_title ?? r.name ?? p.replace("/produits/", ""), a: newAgg() });
      const e = prodMap.get(p)!;
      if (r.page_title || r.name) e.name = r.page_title ?? r.name;
      feed(e.a, r);
    });
    const top_products_viewed = [...prodMap.entries()]
      .map(([page_path, { name, a }]) => ({
        page_path, name,
        views: a.views,
        unique_sessions: a.sessions.size,
        avg_time: a.times.length ? Math.round(mean(a.times)) : 0,
      }))
      .sort((x, y) => y.views - x.views)
      .slice(0, 10);

    // ── Trafic par jour (continuité from→to) ────────────────────────────────
    const dayMap = new Map<string, { views: number; sessions: Set<string> }>();
    const dStart = new Date(from); dStart.setUTCHours(0, 0, 0, 0);
    const dEnd   = new Date(to);
    for (let d = new Date(dStart), guard = 0; d <= dEnd && guard < 4000; d.setUTCDate(d.getUTCDate() + 1), guard++) {
      dayMap.set(d.toISOString().slice(0, 10), { views: 0, sessions: new Set() });
    }
    rows.forEach(r => {
      const key = new Date(r.viewed_at).toISOString().slice(0, 10);
      const e = dayMap.get(key);
      if (e) { e.views++; if (r.session_id) e.sessions.add(r.session_id); }
    });
    const by_day = [...dayMap.entries()].map(([date, e]) => ({ date, views: e.views, sessions: e.sessions.size }));

    // ── Nouveaux vs récurrents par jour (mêmes jours continus que by_day) ────
    // « nouveau » ce jour = visiteur avec is_new_visitor=true ce jour-là ;
    // « récurrent » = visiteur actif ce jour-là mais déjà connu (pas nouveau).
    const nvrDayMap = new Map<string, { newV: Set<string>; allV: Set<string> }>();
    for (const [date] of dayMap) nvrDayMap.set(date, { newV: new Set(), allV: new Set() });
    rows.forEach(r => {
      if (!r.visitor_id) return;
      const e = nvrDayMap.get(new Date(r.viewed_at).toISOString().slice(0, 10));
      if (!e) return;
      e.allV.add(r.visitor_id);
      if (r.is_new_visitor === true) e.newV.add(r.visitor_id);
    });
    const new_returning_by_day = [...nvrDayMap.entries()].map(([date, e]) => ({
      date, new: e.newV.size, returning: Math.max(0, e.allV.size - e.newV.size),
    }));

    // ── Par heure (0-23) & jour de semaine (0=lundi), en heure de Paris ──────
    const hourArr = Array.from({ length: 24 }, () => 0);
    const wdArr   = Array.from({ length: 7 }, () => 0);
    rows.forEach(r => {
      const p = new Date(new Date(r.viewed_at).toLocaleString("en-US", { timeZone: "Europe/Paris" }));
      hourArr[p.getHours()]++;
      wdArr[(p.getDay() + 6) % 7]++;
    });
    const by_hour    = hourArr.map((views, hour) => ({ hour, views }));
    const by_weekday = wdArr.map((views, day) => ({ day, views }));

    // ── Sources (utm_source||referrer_domain||direct + medium) ──────────────
    const srcMap = new Map<string, { source: string; medium: string; sessions: Set<string>; views: number }>();
    rows.forEach(r => {
      const source = (r.utm_source && String(r.utm_source).trim()) || r.referrer_domain || "direct";
      const medium = (r.utm_medium && String(r.utm_medium).trim()) || "";
      const key = `${source}|${medium}`;
      if (!srcMap.has(key)) srcMap.set(key, { source, medium, sessions: new Set(), views: 0 });
      const e = srcMap.get(key)!;
      e.views++; if (r.session_id) e.sessions.add(r.session_id);
    });
    const by_source = [...srcMap.values()]
      .map(s => ({ source: s.source, medium: s.medium, sessions: s.sessions.size, views: s.views }))
      .sort((a, b) => b.sessions - a.sessions).slice(0, 20);

    // ── Canaux agrégés ──────────────────────────────────────────────────────
    const chanMap = new Map<string, Set<string>>();
    rows.forEach(r => {
      const ch = channelOf(r);
      if (!chanMap.has(ch)) chanMap.set(ch, new Set());
      if (r.session_id) chanMap.get(ch)!.add(r.session_id);
    });
    const chanTotal = [...chanMap.values()].reduce((s, set) => s + set.size, 0) || 1;
    const by_channel = [...chanMap.entries()]
      .map(([channel, set]) => ({ channel, sessions: set.size, pct: Math.round((set.size / chanTotal) * 100) }))
      .sort((a, b) => b.sessions - a.sessions);

    // ── Heatmap jour × heure × canal (heure Paris) ───────────────────────────
    // Pour chaque créneau (jour 0=lundi…6, heure 0-23) : sessions distinctes par
    // canal → canal DOMINANT du créneau + volume total de sessions. Alimente la
    // carte croisée trafic (section Acquisition).
    const heatCells: Array<Array<Map<string, Set<string>>>> = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => new Map<string, Set<string>>()));
    rows.forEach(r => {
      if (!r.session_id) return;
      const p = new Date(new Date(r.viewed_at).toLocaleString("en-US", { timeZone: "Europe/Paris" }));
      const day = (p.getDay() + 6) % 7;
      const cell = heatCells[day][p.getHours()];
      const ch = channelOf(r);
      if (!cell.has(ch)) cell.set(ch, new Set());
      cell.get(ch)!.add(r.session_id);
    });
    const traffic_heatmap: { day: number; hour: number; sessions: number; channel: string | null }[] = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const cell = heatCells[day][hour];
        const allSess = new Set<string>();
        let topCh: string | null = null, topN = 0;
        for (const [ch, set] of cell) {
          set.forEach(s => allSess.add(s));
          if (set.size > topN) { topN = set.size; topCh = ch; }
        }
        traffic_heatmap.push({ day, hour, sessions: allSess.size, channel: topCh });
      }
    }

    // ── Référents ───────────────────────────────────────────────────────────
    const refMap = new Map<string, Set<string>>();
    rows.forEach(r => {
      const dom = r.referrer_domain;
      if (!dom) return;
      if (!refMap.has(dom)) refMap.set(dom, new Set());
      if (r.session_id) refMap.get(dom)!.add(r.session_id);
    });
    const top_referrers = [...refMap.entries()]
      .map(([domain, set]) => ({ domain, sessions: set.size }))
      .sort((a, b) => b.sessions - a.sessions).slice(0, 10);

    // ── Campagnes UTM ───────────────────────────────────────────────────────
    const campMap = new Map<string, { campaign: string; source: string; sessions: Set<string> }>();
    rows.forEach(r => {
      const c = r.utm_campaign && String(r.utm_campaign).trim();
      if (!c) return;
      const source = (r.utm_source && String(r.utm_source).trim()) || "—";
      const key = `${c}|${source}`;
      if (!campMap.has(key)) campMap.set(key, { campaign: c, source, sessions: new Set() });
      if (r.session_id) campMap.get(key)!.sessions.add(r.session_id);
    });
    const top_campaigns = [...campMap.values()]
      .map(c => ({ campaign: c.campaign, source: c.source, sessions: c.sessions.size }))
      .sort((a, b) => b.sessions - a.sessions).slice(0, 10);

    // ── Géographie ──────────────────────────────────────────────────────────
    const countryMap = new Map<string, Set<string>>();
    const cityMap = new Map<string, { city: string; region: string; sessions: Set<string>; lats: number[]; lngs: number[] }>();
    rows.forEach(r => {
      if (r.country) {
        if (!countryMap.has(r.country)) countryMap.set(r.country, new Set());
        if (r.session_id) countryMap.get(r.country)!.add(r.session_id);
      }
      if (r.city) {
        const key = `${r.city}|${r.region ?? ""}`;
        if (!cityMap.has(key)) cityMap.set(key, { city: r.city, region: r.region ?? "", sessions: new Set(), lats: [], lngs: [] });
        const e = cityMap.get(key)!;
        if (r.session_id) e.sessions.add(r.session_id);
        // Moyenne lat/lng par ville — on ignore les lignes sans coordonnées.
        if (r.latitude != null && r.longitude != null) {
          const la = Number(r.latitude), lo = Number(r.longitude);
          if (Number.isFinite(la) && Number.isFinite(lo)) { e.lats.push(la); e.lngs.push(lo); }
        }
      }
    });
    const by_country = [...countryMap.entries()].map(([country, set]) => ({ country, sessions: set.size })).sort((a, b) => b.sessions - a.sessions).slice(0, 50);
    const by_city = [...cityMap.values()].map(c => ({
      city: c.city,
      region: c.region,
      sessions: c.sessions.size,
      lat: c.lats.length ? mean(c.lats) : null,
      lng: c.lngs.length ? mean(c.lngs) : null,
    })).sort((a, b) => b.sessions - a.sessions).slice(0, 50);

    // ── Appareils ───────────────────────────────────────────────────────────
    const bucketSessions = (key: (r: any) => string | null) => {
      const m = new Map<string, Set<string>>();
      rows.forEach(r => {
        const k = key(r);
        if (!k) return;
        if (!m.has(k)) m.set(k, new Set());
        if (r.session_id) m.get(k)!.add(r.session_id);
      });
      return m;
    };
    const devM = bucketSessions(r => r.device_type ?? r.device ?? null);
    const devTotal = [...devM.values()].reduce((s, set) => s + set.size, 0) || 1;
    const by_device  = [...devM.entries()].map(([device_type, set]) => ({ device_type, sessions: set.size, pct: Math.round((set.size / devTotal) * 100) })).sort((a, b) => b.sessions - a.sessions);
    const by_os      = [...bucketSessions(r => r.os).entries()].map(([os, set]) => ({ os, sessions: set.size })).sort((a, b) => b.sessions - a.sessions).slice(0, 10);
    const by_browser = [...bucketSessions(r => r.browser).entries()].map(([browser, set]) => ({ browser, sessions: set.size })).sort((a, b) => b.sessions - a.sessions).slice(0, 10);

    // ── Distributions comportement ──────────────────────────────────────────
    const scrollBuckets = { "0-25%": 0, "25-50%": 0, "50-75%": 0, "75-100%": 0 };
    scrolled.forEach(r => {
      const s = Number(r.scroll_depth);
      if (s <= 25) scrollBuckets["0-25%"]++;
      else if (s <= 50) scrollBuckets["25-50%"]++;
      else if (s <= 75) scrollBuckets["50-75%"]++;
      else scrollBuckets["75-100%"]++;
    });
    const scroll_distribution = Object.entries(scrollBuckets).map(([bucket, count]) => ({ bucket, count }));

    const timeBuckets = { "<10s": 0, "10-30s": 0, "30-60s": 0, "1-3min": 0, ">3min": 0 };
    behav.forEach(r => {
      const t = Number(r.time_on_page);
      if (t < 10) timeBuckets["<10s"]++;
      else if (t <= 30) timeBuckets["10-30s"]++;
      else if (t <= 60) timeBuckets["30-60s"]++;
      else if (t <= 180) timeBuckets["1-3min"]++;
      else timeBuckets[">3min"]++;
    });
    const time_distribution = Object.entries(timeBuckets).map(([bucket, count]) => ({ bucket, count }));

    // ── Nouveaux vs récurrents (par visiteur distinct) ──────────────────────
    const newVisitors = new Set<string>();
    rows.forEach(r => { if (r.visitor_id && r.is_new_visitor === true) newVisitors.add(r.visitor_id); });
    const newCount = newVisitors.size;
    const returningCount = [...visitors].filter(v => !newVisitors.has(v)).length;

    // ── Tunnel de conversion (#1) ────────────────────────────────────────────
    // Sessions → Vue produit (view_item) → Ajout panier (add_to_cart) → Checkout
    // (event begin_checkout dédié, émis au clic « Passer au paiement » panier non
    // vide) → Achat (commandes valides). Fini le proxy /panier qui sur-comptait.
    const events = await fetchAllPaged<any>((rf, rt) => supabaseServer
      .from("analytics_events").select("event_type, session_id")
      .gte("created_at", from).lte("created_at", to)
      .order("created_at", { ascending: true }).range(rf, rt));
    const viewSess = new Set<string>(), cartSess = new Set<string>(), checkoutSess = new Set<string>();
    events.forEach(e => {
      if (!e.session_id || (excludeBots && botSet.has(e.session_id))) return;
      if (e.event_type === "view_item")      viewSess.add(e.session_id);
      if (e.event_type === "add_to_cart")    cartSess.add(e.session_id);
      if (e.event_type === "begin_checkout") checkoutSess.add(e.session_id);
    });
    const ordCur = await supabaseServer.from("orders").select("status, shipping_status")
      .in("status", VALID_STATUSES).gte("created_at", from).lte("created_at", to).limit(100000);
    const purchases = (ordCur.data ?? []).filter(isValidOrder).length;
    const funnel = [
      { key: "sessions",    label: "Sessions",     count: sessions.size,      estimated: false },
      { key: "view_item",   label: "Vue produit",  count: viewSess.size,      estimated: false },
      { key: "add_to_cart", label: "Ajout panier", count: cartSess.size,      estimated: false },
      { key: "checkout",    label: "Checkout",     count: checkoutSess.size,  estimated: false },
      { key: "purchase",    label: "Achat",        count: purchases,          estimated: false },
    ];

    // ── Pages d'entrée (#3) ──────────────────────────────────────────────────
    const entryMap = new Map<string, { sessions: Set<string>; bounce: Set<string> }>();
    rows.forEach(r => {
      const ep = r.entry_page; if (!ep || !r.session_id) return;
      if (!entryMap.has(ep)) entryMap.set(ep, { sessions: new Set(), bounce: new Set() });
      const e = entryMap.get(ep)!;
      e.sessions.add(r.session_id);
      if (r.is_bounce) e.bounce.add(r.session_id);
    });
    const entry_pages = [...entryMap.entries()].map(([entry_page, e]) => ({
      entry_page,
      sessions: e.sessions.size,
      bounce_rate: e.sessions.size ? Math.round((e.bounce.size / e.sessions.size) * 100) : 0,
    })).sort((a, b) => b.sessions - a.sessions).slice(0, 15);

    // ── Comparaison N vs N-1 (#4) — deltas sur les KPIs trafic ───────────────
    let deltas: { views: number; sessions: number; visitors: number; avg_time: number } | null = null;
    if (period !== "all") {
      let prevRows = await fetchAllPaged<any>((rf, rt) => supabaseServer
        .from("page_views").select("session_id, visitor_id, time_on_page, scroll_depth, is_bounce, user_agent")
        .gte("viewed_at", fromPrev).lt("viewed_at", from)
        .order("viewed_at", { ascending: true }).range(rf, rt));
      if (excludeBots) { const pb = botSessionIds(prevRows); prevRows = prevRows.filter(r => !r.session_id || !pb.has(r.session_id)); }
      const pSess = new Set<string>(), pVis = new Set<string>(), pTimes: number[] = [];
      prevRows.forEach(r => { if (r.session_id) pSess.add(r.session_id); if (r.visitor_id) pVis.add(r.visitor_id); if (r.time_on_page != null) pTimes.push(Number(r.time_on_page)); });
      deltas = {
        views:    pct(rows.length,   prevRows.length),
        sessions: pct(sessions.size, pSess.size),
        visitors: pct(visitors.size, pVis.size),
        avg_time: pct(avg_time ?? 0, pTimes.length ? Math.round(mean(pTimes)) : 0),
      };
    }

    return Response.json({
      data: {
        total_views: rows.length,
        unique_sessions: sessions.size,
        unique_visitors: visitors.size,
        avg_time_on_page: avg_time,
        avg_scroll_depth: avg_scroll,
        bounce_rate,
        pages_per_session,
        top_pages,
        top_products_viewed,
        by_day,
        by_hour,
        by_weekday,
        by_source,
        by_channel,
        traffic_heatmap,
        top_referrers,
        top_campaigns,
        by_country,
        by_city,
        by_device,
        by_os,
        by_browser,
        scroll_distribution,
        time_distribution,
        new_vs_returning: { new: newCount, returning: returningCount },
        new_returning_by_day,
        funnel,
        entry_pages,
        deltas,
        bots_excluded,
        bots_filter_active: excludeBots,
      },
      error: null,
    });
  } catch (e: any) {
    return Response.json({ data: null, error: e?.message ?? "Erreur interne" });
  }
}
