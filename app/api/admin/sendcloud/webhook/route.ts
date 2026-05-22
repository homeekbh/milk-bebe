import { supabaseServer } from "@/lib/server/supabase";
import { logActivity }    from "@/lib/server/audit";
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
  80:   "livree",          // Livré
  2000: "retour",          // Retour reçu
  2100: "retour",          // Retour en transit
  11:   "expediee",        // En transit
  12:   "expediee",        // En cours de livraison
  1:    "en_preparation",  // En attente
};

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // ✅ Vérification signature Sendcloud
    const secret    = process.env.SENDCLOUD_WEBHOOK_SECRET ?? "";
    const signature = req.headers.get("sendcloud-signature") ?? "";

    if (secret && signature) {
      const { createHmac } = await import("crypto");
      const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
      if (signature !== expected) {
        console.error("Sendcloud webhook: signature invalide");
        return Response.json({ error: "Signature invalide" }, { status: 401 });
      }
    }

    const body = JSON.parse(rawBody);

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
      const RANK: Record<string, number> = { en_preparation: 0, expediee: 1, livree: 2, retour: 3 };
      if ((RANK[newStatus] ?? 0) <= (RANK[order.shipping_status] ?? 0) && newStatus !== "retour") continue;

      // Mettre à jour le statut
      const oldStatus = order.shipping_status;
      await supabaseServer
        .from("orders")
        .update({ shipping_status: newStatus })
        .eq("id", order.id);

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

        // Notification email CLIENT — confirme la livraison + invite à
        // redécouvrir la collection / laisser un avis.
        // Best-effort, indépendant de la réussite de l'email admin.
        if (order.customer_email) {
          const prenom = String(order.customer_name ?? "").split(" ")[0] ?? "";
          await resend.emails.send({
            from:    "M!LK <contact@milkbebe.fr>",
            to:      order.customer_email,
            subject: `Votre colis M!LK est arrivé ! 📦`,
            html: `<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#1a1410;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:540px;margin:0 auto;padding:40px 20px">
    <div style="text-align:center;margin-bottom:28px">
      <div style="display:inline-block;background:#c49a4a;border-radius:12px;padding:14px 28px">
        <span style="color:#1a1410;font-weight:950;font-size:24px;letter-spacing:-1px">M!LK</span>
      </div>
    </div>
    <div style="background:#2a2018;border-radius:20px;padding:32px;border:1px solid rgba(242,237,230,0.08);margin-bottom:24px">
      <h1 style="margin:0 0 14px;color:#f2ede6;font-size:24px;font-weight:950;letter-spacing:-0.5px">
        ${prenom ? `${prenom}, votre` : "Votre"} colis est arrivé 📦
      </h1>
      <p style="margin:0 0 14px;color:rgba(242,237,230,0.7);font-size:15px;line-height:1.7">
        Votre commande <strong style="color:#f2ede6">#${shortId}</strong> vient d'être livrée.
        Bébé peut désormais profiter de la douceur du bambou M!LK 🌿
      </p>
      <p style="margin:0;color:rgba(242,237,230,0.55);font-size:14px;line-height:1.7">
        Une question ou un souci ? Répondez à cet email — on revient vers vous sous 24h.
      </p>
    </div>
    <div style="text-align:center;display:grid;gap:10px;margin-bottom:24px">
      <a href="${baseUrl}/produits" style="display:inline-block;background:#c49a4a;color:#1a1410;padding:14px 32px;border-radius:12px;font-weight:900;font-size:15px;text-decoration:none">
        Redécouvrir la collection M!LK →
      </a>
      <a href="${baseUrl}/avis" style="display:inline-block;color:rgba(242,237,230,0.55);padding:10px;font-weight:700;font-size:13px;text-decoration:underline">
        Laisser un avis
      </a>
    </div>
    <div style="text-align:center;color:rgba(242,237,230,0.2);font-size:12px;line-height:1.8">
      <p style="margin:0">M!LK — Essentiels bébé en bambou premium</p>
      <p style="margin:4px 0 0">contact@milkbebe.fr</p>
    </div>
  </div>
</body>
</html>`,
          }).catch(() => {});
        }
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