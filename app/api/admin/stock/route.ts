import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/stock — vue de stock EN LECTURE (Lot 3b-1).
 * L'ÉDITION du stock reste dans la fiche produit (app/admin/produits/[id]) : ici, rien
 * ne s'écrit. Pour chaque produit publié :
 *   - identité (id, nom, slug, catégorie, image)
 *   - la matrice motif × taille depuis colors[].sizes_stock (+ repli sizes_stock produit)
 *   - le total par produit
 *   - les commandes qui contiennent ce produit (lien via orders.items[].id)
 *
 * ⚠️ Les commandes listées sont TOUTES les commandes, quelle que soit leur classification.
 *    C'est une vue OPÉRATIONNELLE de stock (une vente physique, un cadeau ou une collab
 *    ont sorti le produit du stock, Erika doit les voir), PAS un calcul de CA — donc AUCUN
 *    filtre countsInAccounting/countsInWebStats ici, à dessein.
 *
 * ⚠️ REGROUPEMENT EN MÉMOIRE : on charge toutes les commandes et on croise en JS. Acceptable
 *    au volume actuel (une poignée de commandes). À FORT VOLUME, passer à une requête jsonb
 *    côté base (filtrer orders sur `items @> [{"id": …}]` via un index GIN) au lieu de tout
 *    charger et croiser en mémoire.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const [prodRes, ordRes] = await Promise.all([
      supabaseServer.from("products")
        .select("id, name, slug, category_slug, image_url, published, stock, sizes, sizes_stock, colors")
        .order("name", { ascending: true }),
      supabaseServer.from("orders")
        .select("id, created_at, customer_name, customer_email, items, amount_total, promo_code, classification, source, shipping_status")
        .order("created_at", { ascending: false }),
    ]);
    if (prodRes.error) return Response.json({ error: prodRes.error.message }, { status: 500 });
    if (ordRes.error)  return Response.json({ error: ordRes.error.message },  { status: 500 });

    const products = (prodRes.data ?? []).filter((p: any) => p.published !== false);
    const orders   = ordRes.data ?? [];

    // Index : product_id → commandes qui le contiennent (via items[].id). Une commande peut
    // avoir plusieurs lignes du même produit (tailles/motifs différents) → on les agrège.
    const ordersByProduct = new Map<string, any[]>();
    for (const o of orders) {
      const items = Array.isArray(o.items) ? o.items : [];
      const seen = new Set<string>();
      for (const it of items) {
        const pid = String(it?.id ?? "");
        if (!pid || seen.has(pid)) continue;
        seen.add(pid);
        const lines = items.filter((x: any) => String(x?.id ?? "") === pid);
        const entry = {
          id:              o.id,
          created_at:      o.created_at,
          customer_name:   o.customer_name ?? null,
          customer_email:  o.customer_email ?? null,
          quantity:        lines.reduce((s: number, x: any) => s + (Number(x?.quantity) || 0), 0),
          sizes:           [...new Set(lines.map((x: any) => x?.taille ?? x?.motif_size ?? null).filter(Boolean))] as string[],
          motif_ids:       [...new Set(lines.map((x: any) => x?.motif_id ?? null).filter(Boolean))] as string[],
          amount_total:    Number(o.amount_total ?? 0),
          promo_code:      o.promo_code ?? null,
          classification:  o.classification ?? "cliente",
          source:          o.source ?? null,
          shipping_status: o.shipping_status ?? null,
        };
        if (!ordersByProduct.has(pid)) ordersByProduct.set(pid, []);
        ordersByProduct.get(pid)!.push(entry);
      }
    }

    const rows = products.map((p: any) => {
      const colors = Array.isArray(p.colors) ? p.colors : [];
      const motifs = colors.map((c: any) => ({
        id:          c?.id ?? null,
        name:        c?.name ?? "—",
        hex:         c?.hex ?? null,
        image_url:   c?.image_url ?? null,
        sizes_stock: (c?.sizes_stock && typeof c.sizes_stock === "object") ? c.sizes_stock : {},
        stock:       Number(c?.stock ?? 0),
      }));
      const totalFromMotifs = motifs.reduce((s: number, m: any) => s + (Number(m.stock) || 0), 0);
      const totalFromSizes  = (p.sizes_stock && typeof p.sizes_stock === "object")
        ? Object.values(p.sizes_stock as Record<string, unknown>).reduce((s: number, v) => s + (Number(v) || 0), 0)
        : Number(p.stock ?? 0);
      // Priorité aux motifs (source de vérité) ; repli sur les tailles produit (sans motif).
      const total = motifs.length ? totalFromMotifs : totalFromSizes;
      return {
        id:            p.id,
        name:          p.name,
        slug:          p.slug,
        category_slug: p.category_slug ?? null,
        image_url:     p.image_url ?? null,
        sizes:         Array.isArray(p.sizes) ? p.sizes.map(String) : [],
        sizes_stock:   (p.sizes_stock && typeof p.sizes_stock === "object") ? p.sizes_stock : {},
        motifs,
        total,
        orders:        ordersByProduct.get(String(p.id)) ?? [],
      };
    });

    return Response.json({ products: rows });
  } catch (e: any) {
    return Response.json({ error: e?.message ?? "Erreur interne" }, { status: 500 });
  }
}
