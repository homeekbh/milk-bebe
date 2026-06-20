import { supabaseServer } from "@/lib/server/supabase";
import { logActivity }    from "@/lib/server/audit";
import { Resend }         from "resend";
import type { NextRequest } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Webhook Sendcloud → mise à jour automatique du statut de livraison.
 *
 * Sendcloud POST à chaque changement de statut colis (action
 * "parcel_status_changed"). Codes OFFICIELS — source vérifiée :
 * GET https://panel.sendcloud.sc/api/v2/parcels/statuses
 *
 *   11   = Delivered                      → livree  ✅
 *   93   = Shipment collected by customer  → livree  (retrait point relais effectué)
 *   12   = Awaiting customer pickup        → expediee (colis au relais, pas encore retiré)
 *   3/22/91/92 = en route / pris en charge → expediee (filet : auto-avance si oublié)
 *   8    = Delivery attempt failed         → ignoré (pas de statut "échec" dans M!LK)
 *   80   = Unable to deliver               → ignoré (échec, surtout PAS "livré")
 *   2000 = Cancelled (côté Sendcloud)      → ignoré (ce n'est PAS un retour client)
 * Tout autre code est ignoré (aucun changement de statut).
 *
 * ⚠️ CORRECTION DU BUG : l'ancien mapping avait 80→livree (faux : 80 = échec
 * de livraison) et 11→expediee (faux : 11 = LIVRÉ). Les livraisons arrivant en
 * code 11 étaient donc mappées en "expediee" (no-op) et ne passaient JAMAIS en
 * "livree". 2000→retour était aussi faux (2000 = annulation Sendcloud, pas un
 * retour). Les vrais retours arrivent via un webhook Sendcloud "return" distinct.
 */
const STATUS_MAP: Record<number, string> = {
  11: "livree",   // Delivered
  93: "livree",   // Shipment collected by customer (retrait relais)
  12: "expediee", // Awaiting customer pickup
  3:  "expediee", // En route to sorting center
  22: "expediee", // Shipment picked up by driver
  91: "expediee", // Parcel en route
  92: "expediee", // Driver en route
};

// Filet de sécurité : certains transporteurs renvoient le bon message même si
// l'id numérique varie. Le message Sendcloud canonique pour la livraison est
// "Delivered" (localisé possible). On ne déclenche "livree" QUE sur un message
// de livraison explicite — jamais sur "in transit"/"awaiting pickup".
function messageMeansDelivered(msg: unknown): boolean {
  return /deliver|livr[ée]|bezorgd|zugestellt|consegnat|entregad|collected by customer/i
    .test(String(msg ?? ""));
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // ✅ Vérification signature Sendcloud (HMAC-SHA256 du body brut).
    const secret    = process.env.SENDCLOUD_WEBHOOK_SECRET ?? "";
    const signature = req.headers.get("sendcloud-signature") ?? "";

    if (secret && signature) {
      const { createHmac } = await import("crypto");
      const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
      if (signature !== expected) {
        console.error("Sendcloud webhook: signature invalide");
        return Response.json({ error: "Signature invalide" }, { status: 401 });
      }
    } else if (!secret) {
      // TODO(sécurité) : définir SENDCLOUD_WEBHOOK_SECRET dans Vercel puis le
      // copier depuis le panel Sendcloud. Tant qu'il est absent, le webhook
      // accepte les requêtes NON signées — acceptable temporairement (impact
      // limité : changement de statut commande), à sécuriser avant volume.
      console.warn("[sendcloud-webhook] SENDCLOUD_WEBHOOK_SECRET absent — signature NON vérifiée (TODO: configurer le secret).");
    }

    const body = JSON.parse(rawBody);

    // Sendcloud peut envoyer un tableau ou un objet unique
    const messages = Array.isArray(body) ? body : [body];

    for (const msg of messages) {
      const statusCode     = msg.status?.id ?? msg.parcel?.status?.id;
      const statusMessage  = msg.status?.message ?? msg.parcel?.status?.message ?? "";
      const trackingNumber = msg.parcel?.tracking_number ?? msg.tracking_number;
      const orderNumber    = msg.parcel?.order_number ?? msg.order_number;

      // On a besoin d'au moins un identifiant pour retrouver la commande.
      if (!trackingNumber && !orderNumber) continue;

      // Statut M!LK : mapping par code, + filet sur le message de livraison
      // (robuste si l'id varie selon le transporteur).
      let newStatus = STATUS_MAP[statusCode];
      if (!newStatus && messageMeansDelivered(statusMessage)) newStatus = "livree";
      if (!newStatus) continue;

      // Retrouver la commande — tracking_number EN PRIORITÉ : order_number est
      // l'UUID de la commande tronqué à 30 caractères côté create-label
      // (order_number = order.id.slice(0,30)), donc un .eq("id", orderNumber)
      // ne matche PAS l'UUID complet (36 car.). Le tracking_number, lui, est
      // stocké tel quel et identique au payload Sendcloud.
      let order: { id: string; customer_email: string | null; customer_name: string | null; shipping_status: string } | null = null;
      if (trackingNumber) {
        const { data } = await supabaseServer
          .from("orders")
          .select("id, customer_email, customer_name, shipping_status")
          .eq("tracking_number", trackingNumber)
          .limit(1);
        order = data?.[0] ?? null;
      }
      if (!order && orderNumber) {
        const { data } = await supabaseServer
          .from("orders")
          .select("id, customer_email, customer_name, shipping_status")
          .eq("id", orderNumber)
          .limit(1);
        order = data?.[0] ?? null;
      }
      if (!order) continue;

      // Ne pas rétrograder un statut (ex: livré → expédié)
      const RANK: Record<string, number> = { en_preparation: 0, label_created: 0, expediee: 1, livree: 2, retour: 3 };
      if ((RANK[newStatus] ?? 0) <= (RANK[order.shipping_status] ?? 0) && newStatus !== "retour") continue;

      // Mettre à jour le statut
      const oldStatus = order.shipping_status;
      await supabaseServer
        .from("orders")
        .update({ shipping_status: newStatus })
        .eq("id", order.id);

      // delivered_at : best-effort (la colonne existe — migration 001 — mais on
      // protège le statut critique en isolant cet update secondaire).
      if (newStatus === "livree") {
        const { error: deliveredErr } = await supabaseServer
          .from("orders")
          .update({ delivered_at: new Date().toISOString() })
          .eq("id", order.id);
        if (deliveredErr) console.warn("[sendcloud-webhook] delivered_at non posé:", deliveredErr.message);
      }

      // logActivity — type selon nouveau statut, on log uniquement les transitions significatives
      const logType =
        newStatus === "livree"   ? "commande_livree"   :
        newStatus === "retour"   ? "commande_retour"   :
        newStatus === "expediee" ? "commande_expediee" :
        "commande_statut_modifie";
      await logActivity(
        logType,
        `Sendcloud webhook: ${oldStatus ?? "(none)"} → ${newStatus} pour #${String(order.id).slice(0, 8).toUpperCase()}`,
        {
          entity_id: order.id,
          meta: {
            source:           "sendcloud_webhook",
            old_status:       oldStatus,
            new_status:       newStatus,
            tracking_number:  trackingNumber,
            customer_email:   order.customer_email,
            sendcloud_status: statusCode,
          },
        }
      );

      // Notification email admin si livré
      if (newStatus === "livree") {
        const shortId = order.id.slice(0, 8).toUpperCase();
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";
        await resend.emails.send({
          from:    "M!LK <contact@milkbebe.fr>",
          to:      ["contact@milkbebe.fr"],
          subject: `✅ Colis livré — commande #${shortId}`,
          html: `
            <div style="font-family:sans-serif;padding:24px;max-width:500px">
              <h2 style="color:#1a1410">Colis livré ✅</h2>
              <p>La commande <strong>#${shortId}</strong>
              de <strong>${order.customer_name}</strong> a été livrée.</p>
              <p>Numéro de suivi : <strong>${trackingNumber ?? "—"}</strong></p>
              <a href="${baseUrl}/admin/commandes"
                style="display:inline-block;margin-top:16px;padding:12px 24px;background:#c49a4a;color:#1a1410;font-weight:900;text-decoration:none;border-radius:10px">
                Voir dans l'admin →
              </a>
            </div>
          `,
        }).catch(() => {});

        // NB : pas d'email de livraison à la cliente ici — Mondial Relay /
        // le transporteur la notifie déjà de son côté. La relance avis part
        // séparément via le cron J+7 (api/emails/avis).
      }

      // Notification email admin si retour
      if (newStatus === "retour") {
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