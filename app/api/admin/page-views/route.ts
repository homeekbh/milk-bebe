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

  // Total vues sur la période
  const { data: views } = await supabaseServer
    .from("page_views")
    .select("slug, name, category, viewed_at, session_id")
    .gte("viewed_at", cutoff.toISOString())
    .order("viewed_at", { ascending: false });

  if (!views) return Response.json([]);

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
  });
}