import { supabaseServer } from "@/lib/server/supabase";
import * as Sentry from "@sentry/nextjs";
import { requireAdmin }   from "@/lib/admin-auth";
import { resolveAnalyticsRange, countsInWebStats, VALID_STATUSES, netRatio, ok, fail } from "@/lib/analytics-server";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Top 10 produits par CA. Source = orders.items (jsonb), pas de table
 * order_items peuplée dans ce schéma. Pour rembours_partiel, le CA de chaque
 * ligne est pondéré par le ratio net/brut de la commande.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  try {
    const rr = resolveAnalyticsRange(new URL(req.url).searchParams);
    if (!rr.ok) return fail(rr.error, 400);
    const { from, to } = rr.range;

    const { data, error } = await supabaseServer
      .from("orders")
      .select("items, amount_total, refund_amount, status, shipping_status, created_at, is_internal_test, classification")
      .in("status", VALID_STATUSES)
      .gte("created_at", from).lte("created_at", to)
      .limit(100000);
    if (error) return fail(error.message);

    const map = new Map<string, { id: string; name: string; slug: string; category: string; revenue: number; quantity_sold: number }>();

    (data ?? []).filter(countsInWebStats).forEach(o => {
      const ratio = netRatio(o);
      const items = Array.isArray(o.items) ? o.items : [];
      items.forEach((it: any) => {
        const id   = String(it.id ?? it.slug ?? it.name ?? "");
        if (!id) return;
        const key  = id;
        const qty  = Number(it.quantity ?? 1);
        const rev  = Number(it.price ?? 0) * qty * ratio;
        const cur  = map.get(key) ?? {
          id,
          name:     it.name ?? "Produit",
          slug:     it.slug ?? "",
          category: it.category_slug ?? "",
          revenue:  0,
          quantity_sold: 0,
        };
        cur.revenue       += rev;
        cur.quantity_sold += qty;
        map.set(key, cur);
      });
    });

    const products = [...map.values()]
      .map(p => ({ ...p, revenue: Math.round(p.revenue * 100) / 100 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return ok({ products });
  } catch (e: any) {
    Sentry.captureException(e, { tags: { area: "analytics" } });
    return fail(e?.message ?? "Erreur interne");
  }
}
