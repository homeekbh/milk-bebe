import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import { normalizePeriod, periodRange, fetchAllPaged, ok, fail } from "@/lib/analytics-server";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Agrège les events add_to_wishlist (mises en favoris) sur la période :
 *   - total       : nombre total d'ajouts aux favoris
 *   - top_products : produits les plus favorisés (product_id → nom via products)
 *
 * ⚠️ Donnée NON rétroactive : mesurable uniquement à partir du déploiement du
 * tracking (lib/analytics.ts → trackAddToWishlist → /api/analytics/event).
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  try {
    const period = normalizePeriod(new URL(req.url).searchParams.get("period"));
    const { from, to } = periodRange(period);

    // Events paginés (cap PostgREST 1000/req → sinon total sous-compté).
    const rows = await fetchAllPaged<{ product_id: string | null }>((rf, rt) =>
      supabaseServer
        .from("analytics_events")
        .select("product_id")
        .eq("event_type", "add_to_wishlist")
        .gte("created_at", from).lte("created_at", to)
        .order("created_at", { ascending: true }).range(rf, rt));

    const total = rows.length;

    // Décompte par produit.
    const counts = new Map<string, number>();
    for (const r of rows) {
      if (r.product_id) counts.set(r.product_id, (counts.get(r.product_id) ?? 0) + 1);
    }

    // Résolution des noms via la table products.
    const ids = [...counts.keys()];
    const names = new Map<string, string>();
    if (ids.length > 0) {
      const { data: prods } = await supabaseServer.from("products").select("id, name").in("id", ids);
      for (const p of prods ?? []) names.set(p.id, p.name);
    }

    const top_products = [...counts.entries()]
      .map(([id, count]) => ({ id, name: names.get(id) ?? "Produit", count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return ok({ total, top_products });
  } catch (e: any) {
    return fail(e?.message ?? "Erreur interne");
  }
}
