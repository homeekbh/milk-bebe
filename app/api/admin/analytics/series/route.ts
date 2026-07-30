import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import { resolveAnalyticsRange, fetchAllPaged, botSessionIds, toParis, parisDayKey, enumerateParisDays } from "@/lib/analytics-server";
import * as Sentry from "@sentry/nextjs";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/analytics/series (Lot A5) — série temporelle sessions/visiteurs/vues
 * sur une période calendaire + sa période de comparaison, à granularité hour|day|month.
 *
 * Params : from, to, cfrom, cto (YYYY-MM-DD, Paris), g (hour|day|month), bots (exclude|all).
 * Réutilise l'infra existante : resolveAnalyticsRange (bornes UTC ← jours Paris),
 * fetchAllPaged (pagination PostgREST), botSessionIds (filtre bots), les helpers Paris.
 * Les points VIDES existent avec des zéros (une heure sans trafic = un point à 0).
 * Troncature : pour une période EN COURS (to = aujourd'hui Paris), compare_truncated
 * agrège la période de comparaison sur le MÊME temps écoulé (deltas honnêtes).
 */

type Bucket = { s: Set<string>; v: Set<string>; n: number };
type Metric = { k: string; sessions: number; visitors: number; views: number };
type Gran = "hour" | "day" | "month";

const hourKeysBetween = (fromISO: string, toISO: string, maxKey?: string): string[] => {
  const keys: string[] = [];
  for (const day of enumerateParisDays(fromISO, toISO)) {
    for (let h = 0; h < 24; h++) {
      const k = `${day}T${String(h).padStart(2, "0")}`;
      if (maxKey && k > maxKey) return keys; // période en cours : on s'arrête à l'heure courante
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

const buildSeries = (rows: any[], keys: string[], g: Gran): Metric[] => {
  const map = new Map<string, Bucket>(keys.map(k => [k, { s: new Set<string>(), v: new Set<string>(), n: 0 }]));
  for (const r of rows) {
    const e = map.get(bucketKey(r.viewed_at, g));
    if (!e) continue; // hors fenêtre énumérée (ex. heure future d'aujourd'hui) → ignoré
    e.n++;
    if (r.session_id) e.s.add(r.session_id);
    if (r.visitor_id) e.v.add(r.visitor_id);
  }
  return keys.map(k => { const e = map.get(k)!; return { k, sessions: e.s.size, visitors: e.v.size, views: e.n }; });
};

const totalsOf = (rows: any[]) => {
  const s = new Set<string>(), v = new Set<string>();
  for (const r of rows) { if (r.session_id) s.add(r.session_id); if (r.visitor_id) v.add(r.visitor_id); }
  return { sessions: s.size, visitors: v.size, views: rows.length };
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

    // Bornes UTC des jours Paris (validation format/plage/futur incluse).
    const mainR = resolveAnalyticsRange(new URLSearchParams({ from, to }));
    if (!mainR.ok) return Response.json({ data: null, error: mainR.error }, { status: 400 });
    const cmpR = resolveAnalyticsRange(new URLSearchParams({ from: cfrom, to: cto }));
    if (!cmpR.ok) return Response.json({ data: null, error: cmpR.error }, { status: 400 });

    const fetchRows = (fromISO: string, toISO: string) => fetchAllPaged<any>((rf, rt) => supabaseServer
      .from("page_views")
      .select("*")
      .gte("viewed_at", fromISO).lte("viewed_at", toISO)
      .order("viewed_at", { ascending: true })
      .range(rf, rt));

    let mainRows = await fetchRows(mainR.range.from, mainR.range.to);
    let cmpRows  = await fetchRows(cmpR.range.from, cmpR.range.to);
    if (excludeBots) {
      const bMain = botSessionIds(mainRows); mainRows = mainRows.filter(r => !r.session_id || !bMain.has(r.session_id));
      const bCmp  = botSessionIds(cmpRows);  cmpRows  = cmpRows.filter(r => !r.session_id || !bCmp.has(r.session_id));
    }

    const todayKey = parisDayKey(new Date());
    const inProgress = to === todayKey;
    const maxHourKey = inProgress && g === "hour"
      ? `${todayKey}T${String(toParis(new Date()).getHours()).padStart(2, "0")}`
      : undefined;

    const mainKeys = g === "hour" ? hourKeysBetween(mainR.range.from, mainR.range.to, maxHourKey)
                   : g === "month" ? monthKeysBetween(mainR.range.from, mainR.range.to)
                   : enumerateParisDays(mainR.range.from, mainR.range.to);
    const cmpKeys  = g === "hour" ? hourKeysBetween(cmpR.range.from, cmpR.range.to)
                   : g === "month" ? monthKeysBetween(cmpR.range.from, cmpR.range.to)
                   : enumerateParisDays(cmpR.range.from, cmpR.range.to);

    const points  = buildSeries(mainRows, mainKeys, g);
    const compare = buildSeries(cmpRows, cmpKeys, g);
    const totals         = totalsOf(mainRows);
    const compare_totals = totalsOf(cmpRows);

    // Troncature : période en cours → comparaison au MÊME temps écoulé depuis son début.
    let compare_truncated: { sessions: number; visitors: number; views: number } | null = null;
    if (inProgress) {
      const elapsedMs = Date.now() - new Date(mainR.range.from).getTime();
      const truncEnd  = new Date(cmpR.range.from).getTime() + elapsedMs;
      const tr = cmpRows.filter(r => new Date(r.viewed_at).getTime() < truncEnd);
      compare_truncated = totalsOf(tr);
    }

    return Response.json({
      data: { granularity: g, points, compare, totals, compare_totals, compare_truncated },
      error: null,
    });
  } catch (e: any) {
    Sentry.captureException(e, { tags: { area: "analytics" } });
    return Response.json({ data: null, error: e?.message ?? "Erreur interne" });
  }
}
