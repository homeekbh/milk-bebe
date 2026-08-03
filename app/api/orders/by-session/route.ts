import { supabaseServer } from "@/lib/server/supabase";
import { rateLimit } from "@/lib/server/rateLimit";
import { getClientIp } from "@/lib/server/client-ip";

export const dynamic = "force-dynamic";

/**
 * GET /api/orders/by-session?session_id=cs_xxx
 *
 * Lookup d'une commande par son stripe_session_id, pour la page /success
 * (tracking purchase avec les vraies valeurs). Public : le session_id Stripe
 * est un token opaque non devinable → sa possession suffit. On ne renvoie que
 * des données non sensibles (montant, items, email de la commande elle-même).
 *
 * Race condition webhook : si la commande n'existe pas encore, on réessaie
 * une fois après ~1.5s (total < 3s) puis on renvoie { order: null }.
 */
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function lookup(sessionId: string) {
  const { data } = await supabaseServer
    .from("orders")
    // + champs du périmètre « vente » (countsInAccounting) pour que /success décide s'il émet un
    //   Purchase : classification, shipping_status, is_internal_test, source. Non sensibles.
    .select("id, amount_total, refund_amount, items, customer_email, discount, promo_code, status, shipping_status, classification, is_internal_test, source")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  return data;
}

export async function GET(req: Request) {
  try {
    // Rate limiting (helper partagé + IP fiable Vercel) — 10/min/IP (anti-hammering ;
    // /success ne fait qu'1-2 appels par commande). Le token cs_… opaque reste le garde principal.
    if (!rateLimit(getClientIp(req), { max: 10, window: 60 })) {
      return Response.json({ order: null }, { status: 429 });
    }
    const sessionId = new URL(req.url).searchParams.get("session_id") ?? "";
    if (!sessionId) return Response.json({ order: null });

    let order = await lookup(sessionId);
    if (!order) {
      await sleep(1500);
      order = await lookup(sessionId);
    }
    if (!order) return Response.json({ order: null });

    return Response.json({
      order: {
        id:             order.id,
        amount_total:   order.amount_total,
        refund_amount:  order.refund_amount ?? 0,
        items:          Array.isArray(order.items) ? order.items : [],
        customer_email: order.customer_email,
        discount:       order.discount ?? 0,
        promo_code:     order.promo_code ?? null,
        // Périmètre « vente » (countsInAccounting côté /success) — données non sensibles.
        status:           order.status ?? null,
        shipping_status:  order.shipping_status ?? null,
        classification:   order.classification ?? null,
        is_internal_test: order.is_internal_test ?? false,
        source:           order.source ?? null,
      },
    });
  } catch {
    return Response.json({ order: null });
  }
}
