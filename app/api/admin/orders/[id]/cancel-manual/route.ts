import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { logActivity } from "@/lib/server/audit";
import { restockStock, type StockLine } from "@/lib/server/stock";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/orders/[id]/cancel-manual — annule une SORTIE MANUELLE et REMET le stock.
 *
 * `cancel_refund` est inutilisable ici : il exige une session Stripe réelle et déclenche un
 * remboursement. Cette route : garde « sortie manuelle » uniquement · CLAIM ATOMIQUE du statut
 * (exactement 1× → pas de double restock) · restockStock réutilisé (legacy + restock_motif) ·
 * AUCUN appel Stripe, AUCUN email, AUCUNE facture.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  if (!id) return Response.json({ error: "id manquant" }, { status: 400 });

  const body   = await req.json().catch(() => ({}));
  const reason = body?.reason ? String(body.reason).trim().slice(0, 300) : "annulation sortie manuelle";

  // Charger la commande — garde « manuelle uniquement » (une commande web passe par cancel_refund).
  const { data: order, error: readErr } = await supabaseServer
    .from("orders").select("id, source, status, items").eq("id", id).maybeSingle();
  if (readErr) return Response.json({ error: readErr.message }, { status: 500 });
  if (!order)  return Response.json({ error: "Commande introuvable" }, { status: 404 });
  if (order.source !== "manual") {
    return Response.json({ error: "Réservé aux sorties manuelles. Pour une commande web, utiliser « Annuler + Rembourser »." }, { status: 400 });
  }

  // CLAIM ATOMIQUE : bascule vers annulée seulement si elle ne l'est pas déjà → restock exactement 1×.
  const { data: claimed } = await supabaseServer
    .from("orders")
    .update({ status: "annulee", shipping_status: "annulee", cancelled_at: new Date().toISOString(), cancelled_reason: reason })
    .eq("id", id).eq("source", "manual").neq("status", "annulee")
    .select("id").maybeSingle();
  if (!claimed) return Response.json({ ok: true, already_cancelled: true }); // déjà annulée → pas de double restitution

  // Remise en stock (miroir du décrément) — legacy + motif. Best-effort ; le claim garantit l'unicité.
  const lines: StockLine[] = [];
  for (const it of (Array.isArray(order.items) ? order.items : []) as any[]) {
    const qty = Number(it?.quantity ?? 1);
    if (qty < 1) continue;
    if (it?.is_pack || (typeof it?.id === "string" && it.id.startsWith("pack:"))) {
      for (const pc of (Array.isArray(it.products) ? it.products : [])) {
        if (pc?.id) lines.push({ product_id: String(pc.id), motif_id: pc.motif_id ?? null, size: pc.taille ?? null, qty, name: pc.name });
      }
    } else if (it?.id) {
      lines.push({ product_id: String(it.id), motif_id: it.motif_id ?? null, size: it.motif_size ?? it.taille ?? null, qty, name: it.name });
    }
  }
  await restockStock(lines);

  await logActivity("manual_order_cancelled",
    `Sortie manuelle #${String(id).slice(0, 8).toUpperCase()} annulée — stock restitué (${lines.length} ligne(s))`,
    { entity_id: id, meta: { reason, lines: lines.map(l => ({ product_id: l.product_id, motif_id: l.motif_id, size: l.size, qty: l.qty })) } });

  return Response.json({ ok: true, restocked_lines: lines.length });
}
