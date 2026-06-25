import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import { normalizePeriod, periodRange } from "@/lib/analytics-server";
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

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const period = normalizePeriod(new URL(req.url).searchParams.get("period"));
    const { from, to } = periodRange(period);

    const { data, error } = await supabaseServer
      .from("page_views")
      .select("*")
      .gte("viewed_at", from).lte("viewed_at", to)
      .order("viewed_at", { ascending: true })
      .limit(200000);
    if (error) return Response.json({ data: null, error: error.message });

    const rows = data ?? [];

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
    const cityMap = new Map<string, { city: string; region: string; sessions: Set<string> }>();
    rows.forEach(r => {
      if (r.country) {
        if (!countryMap.has(r.country)) countryMap.set(r.country, new Set());
        if (r.session_id) countryMap.get(r.country)!.add(r.session_id);
      }
      if (r.city) {
        const key = `${r.city}|${r.region ?? ""}`;
        if (!cityMap.has(key)) cityMap.set(key, { city: r.city, region: r.region ?? "", sessions: new Set() });
        if (r.session_id) cityMap.get(key)!.sessions.add(r.session_id);
      }
    });
    const by_country = [...countryMap.entries()].map(([country, set]) => ({ country, sessions: set.size })).sort((a, b) => b.sessions - a.sessions).slice(0, 15);
    const by_city = [...cityMap.values()].map(c => ({ city: c.city, region: c.region, sessions: c.sessions.size })).sort((a, b) => b.sessions - a.sessions).slice(0, 15);

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
      },
      error: null,
    });
  } catch (e: any) {
    return Response.json({ data: null, error: e?.message ?? "Erreur interne" });
  }
}
