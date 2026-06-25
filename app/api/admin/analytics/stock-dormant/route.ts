import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import { isValidOrder, VALID_STATUSES, ok, fail } from "@/lib/analytics-server";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const DORMANT_DAYS = 30; // seuil fixe, indépendant de la période du dashboard

/**
 * Produits avec stock > 0 et aucune vente depuis 30 jours.
 * Dernière vente déduite de orders.items (jsonb), clé par product id ou slug.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  try {
    const [prodRes, ordRes] = await Promise.all([
      supabaseServer.from("products").select("id, name, slug, stock").gt("stock", 0).limit(100000),
      supabaseServer.from("orders").select("items, status, shipping_status, amount_total, refund_amount, created_at")
        .in("status", VALID_STATUSES).gte("created_at", "2024-01-01").limit(200000),
    ]);
    if (prodRes.error) return fail(prodRes.error.message);
    if (ordRes.error)  return fail(ordRes.error.message);

    // last sale (ms) par product id ET par slug
    const lastSold = new Map<string, number>();
    (ordRes.data ?? []).filter(isValidOrder).forEach(o => {
      const t = new Date(o.created_at).getTime();
      (Array.isArray(o.items) ? o.items : []).forEach((it: any) => {
        for (const k of [it.id, it.slug].filter(Boolean)) {
          const key = String(k);
          const prev = lastSold.get(key);
          if (prev === undefined || t > prev) lastSold.set(key, t);
        }
      });
    });

    const now = Date.now();
    const cutoff = now - DORMANT_DAYS * 24 * 60 * 60 * 1000;

    const products = (prodRes.data ?? [])
      .map((p: any) => {
        const t = lastSold.get(String(p.id)) ?? lastSold.get(String(p.slug));
        return {
          id:           p.id,
          name:         p.name,
          slug:         p.slug,
          stock:        p.stock,
          last_sold_at: t ? new Date(t).toISOString() : null,
          days_dormant: t ? Math.floor((now - t) / (24 * 60 * 60 * 1000)) : null,
        };
      })
      .filter(p => p.last_sold_at === null || new Date(p.last_sold_at).getTime() < cutoff)
      .sort((a, b) => (b.days_dormant ?? 99999) - (a.days_dormant ?? 99999));

    return ok({ products });
  } catch (e: any) {
    return fail(e?.message ?? "Erreur interne");
  }
}
