import { supabaseServer } from "@/lib/server/supabase";
import * as Sentry from "@sentry/nextjs";
import { requireAdmin }   from "@/lib/admin-auth";
import { resolveAnalyticsRange, fetchAllPaged, ok, fail } from "@/lib/analytics-server";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Agrège les events favoris sur la période (état net, pas juste le cumul d'ajouts) :
 *   - active            : ajouts − retraits (tous motifs) — favoris nets, min 0
 *   - adds              : total add_to_wishlist
 *   - removed_manual    : remove_from_wishlist reason "manual" (l'utilisateur a retiré)
 *   - removed_purchased : remove_from_wishlist reason "purchased" (a mené à un achat)
 *   - top_products      : produits les plus favorisés (ajouts, nom via products)
 *
 * ⚠️ Donnée NON rétroactive : mesurable uniquement depuis le déploiement du tracking
 * (lib/analytics.ts → trackAddToWishlist / trackRemoveFromWishlist → /api/analytics/event).
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  try {
    const rr = resolveAnalyticsRange(new URL(req.url).searchParams);
    if (!rr.ok) return fail(rr.error, 400);
    const { from, to } = rr.range;

    // Ajouts + retraits en une passe (paginé — cap PostgREST 1000/req).
    const rows = await fetchAllPaged<{ event_type: string; product_id: string | null; metadata: any }>((rf, rt) =>
      supabaseServer
        .from("analytics_events")
        .select("event_type, product_id, metadata")
        .in("event_type", ["add_to_wishlist", "remove_from_wishlist"])
        .gte("created_at", from).lte("created_at", to)
        .order("created_at", { ascending: true }).range(rf, rt));

    let adds = 0, removed_manual = 0, removed_purchased = 0;
    const counts = new Map<string, number>(); // top produits favorisés (sur les ajouts)
    for (const r of rows) {
      if (r.event_type === "add_to_wishlist") {
        adds++;
        if (r.product_id) counts.set(r.product_id, (counts.get(r.product_id) ?? 0) + 1);
      } else {
        // remove_from_wishlist — "purchased" = signal positif, sinon retrait manuel.
        if (r.metadata?.reason === "purchased") removed_purchased++;
        else removed_manual++;
      }
    }
    const removed_total = removed_manual + removed_purchased;
    const active = Math.max(0, adds - removed_total);

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

    return ok({ active, adds, removed_manual, removed_purchased, removed_total, top_products });
  } catch (e: any) {
    Sentry.captureException(e, { tags: { area: "analytics" } });
    return fail(e?.message ?? "Erreur interne");
  }
}
