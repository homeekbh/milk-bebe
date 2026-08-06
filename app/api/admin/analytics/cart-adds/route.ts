import { supabaseServer } from "@/lib/server/supabase";
import * as Sentry from "@sentry/nextjs";
import { requireAdmin } from "@/lib/admin-auth";
import { resolveAnalyticsRange, fetchAllPaged, ok, fail, parisDayKey, enumerateParisDays } from "@/lib/analytics-server";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/analytics/cart-adds — ajouts au panier (event add_to_cart) de la
 * période, agrégés PAR PRODUIT et PAR JOUR.
 *
 * ⚠️ PERFORMANCE (analytics_events n'a aucun index, view_item = 85 % des lignes) :
 *  - event_type=add_to_cart ET created_at bornés CÔTÉ SQL → on ne rapatrie JAMAIS
 *    les view_item ni l'historique complet ; seuls les add_to_cart de la période.
 *  - Agrégation faite CÔTÉ SERVEUR (jamais les lignes brutes renvoyées au client).
 *
 * Unité = ÉVÉNEMENTS (un visiteur peut générer plusieurs ajouts) — distincte des
 * « sessions » du tunnel et des « paniers identifiés » d'abandoned_carts.
 *
 * Packs : product_id est NULL (uuid absent de products) → l'id réel vit dans
 * metadata.product_ref (cf. /api/analytics/event) → résolu via la table packs.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  try {
    const rr = resolveAnalyticsRange(new URL(req.url).searchParams);
    if (!rr.ok) return fail(rr.error, 400);
    const { from, to } = rr.range;

    const rows = await fetchAllPaged<{ product_id: string | null; metadata: any; value: number | null; created_at: string }>((rf, rt) =>
      supabaseServer
        .from("analytics_events")
        .select("product_id, metadata, value, created_at")
        .eq("event_type", "add_to_cart")
        .gte("created_at", from).lte("created_at", to)
        .order("created_at", { ascending: true }).range(rf, rt));

    // Agrégation par produit/pack (clé = "product:<id>" | "pack:<id>" | "pack:inconnu").
    type Agg = { id: string; kind: "product" | "pack"; count: number; value: number; last: string };
    const byKey = new Map<string, Agg>();
    const productIds = new Set<string>();
    const packIds = new Set<string>();
    for (const r of rows) {
      let id: string, kind: "product" | "pack";
      if (r.product_id) { id = r.product_id; kind = "product"; productIds.add(id); }
      else {
        const ref = r.metadata?.product_ref;
        kind = "pack";
        id = typeof ref === "string" && ref ? ref : "inconnu";
        if (id !== "inconnu") packIds.add(id);
      }
      const key = `${kind}:${id}`;
      const cur = byKey.get(key) ?? { id, kind, count: 0, value: 0, last: r.created_at };
      cur.count++;
      cur.value += Number(r.value ?? 0);
      if (r.created_at > cur.last) cur.last = r.created_at;
      byKey.set(key, cur);
    }

    // Résolution des noms — 2 requêtes bornées (IN sur les seuls ids rencontrés).
    const names = new Map<string, string>();
    if (productIds.size > 0) {
      const { data } = await supabaseServer.from("products").select("id, name").in("id", [...productIds]);
      for (const p of data ?? []) names.set(`product:${p.id}`, p.name);
    }
    if (packIds.size > 0) {
      const { data } = await supabaseServer.from("packs").select("id, title").in("id", [...packIds]);
      for (const p of data ?? []) names.set(`pack:${p.id}`, p.title);
    }

    const by_product = [...byKey.entries()]
      .map(([key, a]) => ({
        id: a.id,
        kind: a.kind,
        name: names.get(key) ?? (a.kind === "pack" ? "Pack" : "Produit"),
        count: a.count,
        value: Math.round(a.value * 100) / 100,
        last: a.last,
      }))
      .sort((x, y) => y.count - x.count);

    // Répartition temporelle : par jour calendaire Paris, continu sur la période.
    const dayMap = new Map<string, number>();
    for (const k of enumerateParisDays(from, to)) dayMap.set(k, 0);
    for (const r of rows) { const k = parisDayKey(r.created_at); if (dayMap.has(k)) dayMap.set(k, (dayMap.get(k) ?? 0) + 1); }
    const by_day = [...dayMap.entries()].map(([date, count]) => ({ date, count }));

    return ok({ total_adds: rows.length, by_product, by_day });
  } catch (e: any) {
    Sentry.captureException(e, { tags: { area: "analytics" } });
    return fail(e?.message ?? "Erreur interne");
  }
}
