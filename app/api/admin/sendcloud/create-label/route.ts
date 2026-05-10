import { supabaseServer } from "@/lib/server/supabase";
import { Resend }         from "resend";
import type { NextRequest } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Webhook Sendcloud → mise à jour statut commande automatique
 *
 * Sendcloud envoie un POST à chaque changement de statut colis.
 * Statuts Sendcloud → statuts M!LK :
 *   11 = En transit      → shipped (déjà fait)
 *   12 = Livraison       → shipped
 *   80 = Livré           → delivered ✅
 *   2000 = Retour        → returned
 *   1 = En attente       → pending
 */

const STATUS_MAP: Record<number, string> = {
  80:   "delivered",   // Livré
  2000: "returned",    // Retour reçu
  2100: "returned",    // Retour en transit
  11:   "shipped",     // En transit
  12:   "shipped",     // En cours de livraison
  1:    "pending",     // En attente
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Sendcloud peut envoyer un tableau ou un objet unique
    const messages = Array.isArray(body) ? body : [body];

    for (const msg of messages) {
      const statusCode    = msg.status?.id ?? msg.parcel?.status?.id;
      const trackingNumber = msg.parcel?.tracking_number ?? msg.tracking_number;
      const orderNumber    = msg.parcel?.order_number ?? msg.order_number;

      if (!statusCode || !orderNumber) continue;

      const newStatus = STATUS_MAP[statusCode];
      if (!newStatus) continue;

      // Trouver la commande par order_id ou tracking_number
      let query = supabaseServer.from("orders").select("id, customer_email, customer_name, shipping_status");

      if (orderNumber) {
        query = query.eq("id", orderNumber) as any;
      } else if (trackingNumber) {
        query = query.eq("tracking_number", trackingNumber) as any;
      } else {
        continue;
      }

      const { data: orders } = await query.limit(1);
      const order = orders?.[0];
      if (!order) continue;

      // Ne pas rétrograder un statut (ex: livré → expédié)
      const RANK: Record<string, number> = { pending: 0, shipped: 1, delivered: 2, returned: 3 };
      if ((RANK[newStatus] ?? 0) <= (RANK[order.shipping_status] ?? 0) && newStatus !== "returned") continue;

      // Mettre à jour le statut
      await supabaseServer
        .from("orders")
        .update({ shipping_status: newStatus })
        .eq("id", order.id);

      // Notification email admin si livré
      if (newStatus === "delivered") {
        await resend.emails.send({
          from:    "M!LK <contact@milkbebe.fr>",
          to:      ["contact@milkbebe.fr"],
          subject: `✅ Colis livré — commande #${order.id.slice(0, 8).toUpperCase()}`,
          html: `
            <div style="font-family:sans-serif;padding:24px;max-width:500px">
              <h2 style="color:#1a1410">Colis livré ✅</h2>
              <p>La commande <strong>#${order.id.slice(0, 8).toUpperCase()}</strong> 
              de <strong>${order.customer_name}</strong> a été livrée.</p>
              <p>Numéro de suivi : <strong>${trackingNumber ?? "—"}</strong></p>
              <a href="${process.env.NEXT_PUBLIC_BASE_URL}/admin/commandes" 
                style="display:inline-block;margin-top:16px;padding:12px 24px;background:#c49a4a;color:#1a1410;font-weight:900;text-decoration:none;border-radius:10px">
                Voir dans l'admin →
              </a>
            </div>
          `,
        }).catch(() => {});
      }

      // Notification email admin si retour
      if (newStatus === "returned") {
        await resend.emails.send({
          from:    "M!LK <contact@milkbebe.fr>",
          to:      ["contact@milkbebe.fr"],
          subject: `↩️ Retour reçu — commande #${order.id.slice(0, 8).toUpperCase()}`,
          html: `
            <div style="font-family:sans-serif;padding:24px;max-width:500px">
              <h2 style="color:#b91c1c">Retour reçu ↩️</h2>
              <p>Un retour a été détecté pour la commande <strong>#${order.id.slice(0, 8).toUpperCase()}</strong> 
              de <strong>${order.customer_name}</strong>.</p>
              <p>Numéro de suivi : <strong>${trackingNumber ?? "—"}</strong></p>
              <a href="${process.env.NEXT_PUBLIC_BASE_URL}/admin/commandes"
                style="display:inline-block;margin-top:16px;padding:12px 24px;background:#1a1410;color:#f2ede6;font-weight:900;text-decoration:none;border-radius:10px">
                Voir dans l'admin →
              </a>
            </div>
          `,
        }).catch(() => {});
      }
    }

    return Response.json({ ok: true });
  } catch (e: any) {
    console.error("Sendcloud webhook error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}