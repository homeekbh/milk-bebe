import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

/**
 * GET /api/admin/page-views
 * Retourne les stats de vues par produit
 * Query params: ?days=30
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") ?? "30");
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  // Total vues sur la période. On tente AVEC utm_source/device (migration 007).
  // Si ces colonnes n'existent pas encore → fallback sans, attribution = vide.
  let views: any[] | null = null;
  let hasSource = true;
  {
    const withSrc = await supabaseServer
      .from("page_views")
      .select("slug, name, category, viewed_at, session_id, utm_source, device")
      .gte("viewed_at", cutoff.toISOString())
      .order("viewed_at", { ascending: false });
    if (withSrc.error) {
      hasSource = false;
      const noSrc = await supabaseServer
        .from("page_views")
        .select("slug, name, category, viewed_at, session_id")
        .gte("viewed_at", cutoff.toISOString())
        .order("viewed_at", { ascending: false });
      views = noSrc.data;
    } else {
      views = withSrc.data;
    }
  }

  if (!views) return Response.json([]);

  // ── Visiteurs (sessions uniques) aujourd'hui vs hier ──────────────────────
  const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
  const startYest  = new Date(startToday); startYest.setDate(startYest.getDate() - 1);
  const sessToday = new Set<string>();
  const sessYest  = new Set<string>();
  let viewsToday = 0, viewsYest = 0;
  views.forEach(v => {
    const t = new Date(v.viewed_at);
    if (t >= startToday)                    { viewsToday++; if (v.session_id) sessToday.add(v.session_id); }
    else if (t >= startYest && t < startToday) { viewsYest++;  if (v.session_id) sessYest.add(v.session_id); }
  });

  // ── Attribution par canal (utm_source) sur la période ─────────────────────
  const sourceMap: Record<string, { source: string; views: number; sessions: Set<string> }> = {};
  if (hasSource) {
    views.forEach(v => {
      const src = (v.utm_source && String(v.utm_source).trim()) ? String(v.utm_source) : "direct";
      if (!sourceMap[src]) sourceMap[src] = { source: src, views: 0, sessions: new Set() };
      sourceMap[src].views++;
      if (v.session_id) sourceMap[src].sessions.add(v.session_id);
    });
  }
  const bySource = Object.values(sourceMap)
    .map(s => ({ source: s.source, views: s.views, sessions: s.sessions.size }))
    .sort((a, b) => b.sessions - a.sessions);

  // Grouper par slug
  const map: Record<string, { slug: string; name: string; category: string; views: number; sessions: Set<string> }> = {};
  views.forEach(v => {
    if (!map[v.slug]) map[v.slug] = { slug: v.slug, name: v.name ?? v.slug, category: v.category ?? "", views: 0, sessions: new Set() };
    map[v.slug].views++;
    if (v.session_id) map[v.slug].sessions.add(v.session_id);
  });

  // Vues par jour (30 derniers jours)
  const byDay: Record<string, number> = {};
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
    byDay[key] = 0;
  }
  views.forEach(v => {
    const key = new Date(v.viewed_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
    if (key in byDay) byDay[key]++;
  });

  const result = Object.values(map)
    .map(p => ({ ...p, sessions: p.sessions.size }))
    .sort((a, b) => b.views - a.views);

  return Response.json({
    top_products: result.slice(0, 10),
    total_views:  views.length,
    unique_sessions: new Set(views.map(v => v.session_id).filter(Boolean)).size,
    by_day: Object.entries(byDay).map(([label, value]) => ({ label, value })),
    // ── Aujourd'hui vs hier (visiteurs = sessions uniques) ──
    visitors_today:     sessToday.size,
    visitors_yesterday: sessYest.size,
    views_today:        viewsToday,
    views_yesterday:    viewsYest,
    // ── Attribution par canal (vide tant que la migration 007 n'est pas lancée) ──
    has_source: hasSource,
    by_source:  bySource,
  });
}