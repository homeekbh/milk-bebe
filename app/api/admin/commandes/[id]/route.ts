import Stripe from "stripe";
import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import { logActivity }    from "@/lib/server/audit";
import type { NextRequest } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const BASE   = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

/**
 * Extrait la taille depuis le nom (ex: "Body éclairs — 0-3 mois" → "0-3 mois")
 */
function extractTailleFromName(name: string): string | null {
  if (!name) return null;
  const parts = String(name).split(" — ");
  if (parts.length < 2) return null;
  const last = parts[parts.length - 1].trim();
  const patterns = [/^Nouveau-né$/i, /^\d+-\d+\s*mois$/i, /^0-6\s*mois$/i, /^6-12\s*mois$/i, /^Taille unique$/i, /^Naissance$/i];
  return patterns.some(p => p.test(last)) ? last : null;
}

/**
 * Réintègre le stock pour chaque item d'une commande annulée.
 * Best-effort : on continue même si un produit échoue.
 */
async function restoreStock(items: any[]): Promise<{ restored: number; errors: string[] }> {
  const errors: string[] = [];
  let restored = 0;

  for (const item of (Array.isArray(items) ? items : [])) {
    const qty = Number(item.quantity ?? 1);
    if (qty < 1) continue;

    // Trouver le produit par id ou slug
    let product: any = null;
    if (item.id) {
      const { data } = await supabaseServer.from("products").select("id, stock, sizes_stock, slug").eq("id", item.id).single();
      product = data;
    }
    if (!product && item.slug) {
      const { data } = await supabaseServer.from("products").select("id, stock, sizes_stock, slug").eq("slug", item.slug).single();
      product = data;
    }
    if (!product) {
      errors.push(`Produit introuvable: ${item.name ?? item.id ?? item.slug}`);
      continue;
    }

    const newStock = (product.stock ?? 0) + qty;
    const updatePayload: Record<string, any> = { stock: newStock };

    const taille = extractTailleFromName(item.name ?? "");
    if (taille && product.sizes_stock && typeof product.sizes_stock === "object") {
      const sizes = { ...product.sizes_stock };
      sizes[taille] = (sizes[taille] ?? 0) + qty;
      updatePayload.sizes_stock = sizes;
    }

    const { error } = await supabaseServer.from("products").update(updatePayload).eq("id", product.id);
    if (error) errors.push(`${product.slug}: ${error.message}`);
    else restored++;
  }

  return { restored, errors };
}

/**
 * POST /api/admin/commandes/[id]
 * Body:
 *   { action: "cancel_refund", reason?: string, custom_message?: string }
 *   { action: "refund_partial", amount: number (euros), reason?: string }
 *   { action: "mark_delivered" }
 *
 * Live Stripe — les refunds sont VRAIS (irréversibles).
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { id: orderId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "").toLowerCase();

  if (!orderId) return Response.json({ error: "order id manquant" }, { status: 400 });
  if (!action)  return Response.json({ error: "action manquante" }, { status: 400 });

  // Charger la commande
  const { data: order, error: orderErr } = await supabaseServer
    .from("orders").select("*").eq("id", orderId).single();
  if (orderErr || !order) {
    return Response.json({ error: "Commande introuvable" }, { status: 404 });
  }

  // === ACTION: cancel_refund — annulation totale + remboursement Stripe ===
  if (action === "cancel_refund") {
    if (order.status === "refunded" || order.shipping_status === "cancelled") {
      return Response.json({ error: "Commande déjà annulée/remboursée" }, { status: 400 });
    }
    if (!order.stripe_session_id) {
      return Response.json({ error: "stripe_session_id manquant — refund impossible" }, { status: 400 });
    }

    // 1. Récupérer payment_intent depuis la session Stripe
    let paymentIntentId: string | null = null;
    try {
      const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
      paymentIntentId = (typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id) ?? null;
    } catch (e: any) {
      console.error("[commandes/cancel] Stripe session retrieve:", e?.message);
      return Response.json({ error: "Impossible de récupérer la session Stripe", details: e?.message }, { status: 502 });
    }
    if (!paymentIntentId) {
      return Response.json({ error: "Aucun payment_intent associé à cette commande" }, { status: 400 });
    }

    // 2. Créer le refund Stripe (full) — IRRÉVERSIBLE
    let refundId: string | null = null;
    let refundAmount = 0;
    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        reason: body?.reason ? "requested_by_customer" : undefined,
        metadata: {
          order_id: orderId,
          admin_reason: String(body?.reason ?? "Annulation admin").slice(0, 500),
        },
      }, { idempotencyKey: `refund-${orderId}` });
      refundId    = refund.id;
      refundAmount = (refund.amount ?? 0) / 100;
    } catch (e: any) {
      console.error("[commandes/cancel] Stripe refund error:", e?.message);
      return Response.json({ error: "Erreur Stripe refund", details: e?.message }, { status: 502 });
    }

    // 3. Réintégrer le stock
    const stockResult = await restoreStock(order.items ?? []);

    // 4. Update Supabase
    await supabaseServer.from("orders").update({
      status:           "refunded",
      shipping_status:  "cancelled",
      refund_id:        refundId,
      refund_amount:    refundAmount,
      refunded_at:      new Date().toISOString(),
      cancelled_at:     new Date().toISOString(),
      cancelled_reason: body?.reason ?? null,
    }).eq("id", orderId);

    // 5. Envoyer email annulation au client (best-effort)
    let emailOk = true;
    try {
      const res = await fetch(`${BASE}/api/emails/cancellation`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_EMAIL_SECRET ?? "" },
        body:    JSON.stringify({
          email:          order.customer_email,
          prenom:         order.customer_name?.split(" ")[0] ?? "",
          order_number:   orderId,
          custom_message: body?.custom_message ?? null,
        }),
      });
      if (!res.ok) emailOk = false;
    } catch { emailOk = false; }

    // 6. logActivity
    await logActivity("commande_annulee", `Commande #${orderId.slice(0,8)} annulée et remboursée (${refundAmount.toFixed(2)} €)`, {
      entity_id: orderId,
      meta: { refund_id: refundId, refund_amount: refundAmount, client_email: order.customer_email, stock_restored: stockResult.restored, stock_errors: stockResult.errors, email_sent: emailOk },
    });

    return Response.json({
      ok:                true,
      refund_id:         refundId,
      refund_amount:     refundAmount,
      stock_restored:    stockResult.restored,
      stock_errors:      stockResult.errors,
      email_sent:        emailOk,
    });
  }

  // === ACTION: refund_partial — remboursement partiel sans annuler ===
  if (action === "refund_partial") {
    const amount = Number(body?.amount ?? 0);
    if (!amount || amount <= 0) {
      return Response.json({ error: "Montant invalide" }, { status: 400 });
    }
    if (amount > Number(order.amount_total ?? 0)) {
      return Response.json({ error: "Montant supérieur à la commande" }, { status: 400 });
    }
    if (!order.stripe_session_id) {
      return Response.json({ error: "stripe_session_id manquant" }, { status: 400 });
    }

    let paymentIntentId: string | null = null;
    try {
      const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
      paymentIntentId = (typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id) ?? null;
    } catch (e: any) {
      return Response.json({ error: "Session Stripe introuvable", details: e?.message }, { status: 502 });
    }
    if (!paymentIntentId) {
      return Response.json({ error: "payment_intent introuvable" }, { status: 400 });
    }

    let refund: Stripe.Refund;
    try {
      refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount:         Math.round(amount * 100),
        metadata: {
          order_id: orderId,
          admin_reason: String(body?.reason ?? "Refund partiel").slice(0, 500),
        },
      });
    } catch (e: any) {
      console.error("[commandes/refund_partial] Stripe error:", e?.message);
      return Response.json({ error: "Erreur Stripe refund", details: e?.message }, { status: 502 });
    }

    // Cumul si refund partiel déjà existant
    const previousRefund = Number(order.refund_amount ?? 0);
    const cumul          = previousRefund + amount;

    await supabaseServer.from("orders").update({
      status:        cumul >= Number(order.amount_total ?? 0) ? "refunded" : "partial_refund",
      refund_id:     refund.id,
      refund_amount: cumul,
      refunded_at:   new Date().toISOString(),
    }).eq("id", orderId);

    await logActivity("commande_remboursee_partielle", `Remboursement partiel ${amount.toFixed(2)} € sur #${orderId.slice(0,8)}`, {
      entity_id: orderId,
      meta: { refund_id: refund.id, amount, cumul, reason: body?.reason ?? null },
    });

    return Response.json({ ok: true, refund_id: refund.id, amount, cumul });
  }

  // === ACTION: mark_delivered ===
  if (action === "mark_delivered") {
    await supabaseServer.from("orders").update({
      shipping_status: "delivered",
      delivered_at:    new Date().toISOString(),
    }).eq("id", orderId);

    await logActivity("commande_livree", `Commande #${orderId.slice(0,8)} marquée livrée`, {
      entity_id: orderId,
      meta: { customer_email: order.customer_email },
    });

    return Response.json({ ok: true });
  }

  return Response.json({ error: "Action inconnue", supported: ["cancel_refund", "refund_partial", "mark_delivered"] }, { status: 400 });
}

/**
 * GET /api/admin/commandes/[id]/refunds
 * (Non implémenté ici, à faire dans un sous-folder si nécessaire)
 */
