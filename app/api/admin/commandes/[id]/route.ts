import Stripe from "stripe";
import { Resend } from "resend";
import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import { logActivity }    from "@/lib/server/audit";
import type { NextRequest } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY);
const BASE   = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

const ADMIN_EMAILS = [
  process.env.ADMIN_EMAIL_1,
  process.env.ADMIN_EMAIL_2,
  process.env.ADMIN_EMAIL_3,
].filter(Boolean) as string[];

const SENDCLOUD_V3 = "https://panel.sendcloud.sc/api/v3";

function getBasicAuthSendcloud() {
  const pub = process.env.SENDCLOUD_PUBLIC_KEY ?? "";
  const sec = process.env.SENDCLOUD_SECRET_KEY ?? "";
  return "Basic " + Buffer.from(`${pub}:${sec}`).toString("base64");
}

/**
 * Annule un shipment Sendcloud (best-effort).
 * Appelé après un remboursement Stripe pour libérer l'étiquette côté
 * transporteur — Sendcloud n'envoie plus la collecte au carrier.
 *
 * Best-effort : si Sendcloud renvoie 4xx/5xx ou si fetch fail, on log
 * un warning mais on NE bloque PAS l'admin (le refund Stripe est déjà
 * effectué — pas question de cracher dessus pour une cancel Sendcloud).
 *
 * Reset sendcloud_parcel_id et label_url en base après tentative (qu'elle
 * réussisse ou non) pour que l'UI reflète l'état "plus d'étiquette".
 */
async function cancelSendcloudShipment(orderId: string, parcelId: string | null): Promise<{ ok: boolean; error: string | null }> {
  if (!parcelId) return { ok: true, error: null }; // rien à annuler

  let resultOk = false;
  let lastError: string | null = null;
  try {
    const res = await fetch(`${SENDCLOUD_V3}/shipments/${encodeURIComponent(parcelId)}`, {
      method:  "DELETE",
      headers: {
        Authorization: getBasicAuthSendcloud(),
        Accept:        "application/json",
      },
    });
    const text = await res.text().catch(() => "");
    console.log(`[sendcloud:cancel-after-refund] DELETE shipments/${parcelId} HTTP ${res.status} body=${text.slice(0, 400)}`);
    if (res.ok || res.status === 404) {
      // 404 = déjà annulé/inexistant → considéré OK pour notre logique
      resultOk = true;
    } else {
      lastError = `HTTP ${res.status} — ${text.slice(0, 300)}`;
    }
  } catch (e: any) {
    lastError = e?.message ?? "exception inconnue";
    console.warn(`[sendcloud:cancel-after-refund] exception sur DELETE shipments/${parcelId}:`, lastError);
  }

  // Reset DB systématique — même si l'API Sendcloud a échoué, on retire
  // les références côté nous pour que l'UI bascule en "annulé".
  const { error: dbErr } = await supabaseServer
    .from("orders")
    .update({
      sendcloud_parcel_id: null,
      label_url:           null,
    })
    .eq("id", orderId);
  if (dbErr) {
    console.warn(`[sendcloud:cancel-after-refund] Supabase reset error: ${dbErr.message}`);
  }

  return { ok: resultOk, error: lastError };
}

/**
 * Envoi de l'email annulation avec retry et notification admin en cas d'échec.
 * Retourne true si l'email a été envoyé au client, false sinon.
 */
async function sendCancellationEmailWithRetry(opts: {
  email:           string;
  prenom:          string;
  order_number:    string;
  custom_message:  string | null;
  refund_amount:   number;
}): Promise<{ ok: boolean; attempts: number; last_error: string | null }> {
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${BASE}/api/emails/cancellation`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_EMAIL_SECRET ?? "" },
        body:    JSON.stringify({
          email:          opts.email,
          prenom:         opts.prenom,
          order_number:   opts.order_number,
          custom_message: opts.custom_message,
        }),
      });
      if (res.ok) return { ok: true, attempts: attempt, last_error: null };
      lastError = `HTTP ${res.status} — ${await res.text().catch(() => "(no body)")}`;
    } catch (e: any) {
      lastError = e?.message ?? "exception inconnue";
    }
    // Backoff progressif : 1s, 2s, (3s pour le dernier inutile car on n'attend pas après)
    if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 1000));
  }

  // Toutes les tentatives ont échoué → notifier l'admin (best-effort)
  if (ADMIN_EMAILS.length > 0) {
    try {
      await resend.emails.send({
        from:    "M!LK <contact@milkbebe.fr>",
        to:      ADMIN_EMAILS,
        subject: `⚠️ Email annulation NON envoyé — commande #${opts.order_number.slice(0,8).toUpperCase()}`,
        html: `
          <div style="font-family:sans-serif;padding:24px;max-width:540px">
            <h2 style="color:#b91c1c;margin:0 0 12px">Email annulation échoué (3 tentatives)</h2>
            <p>L'email d'annulation pour la commande <strong>#${opts.order_number.slice(0,8).toUpperCase()}</strong> de <strong>${opts.email}</strong> n'a pas pu être envoyé.</p>
            <p style="background:#fee2e2;padding:12px;border-radius:8px;font-size:13px;color:#991b1b">
              Dernière erreur : <code>${lastError ?? "(inconnu)"}</code>
            </p>
            <p>Le remboursement Stripe (<strong>${opts.refund_amount.toFixed(2)} €</strong>) <strong>a bien été effectué</strong>, mais le client n'a pas été notifié par email automatique.</p>
            <p>📞 <strong>Action requise :</strong> contacter le client manuellement à <a href="mailto:${opts.email}">${opts.email}</a>.</p>
            <a href="${BASE}/admin/commandes" style="display:inline-block;margin-top:12px;padding:12px 22px;background:#1a1410;color:#c49a4a;font-weight:900;border-radius:10px;text-decoration:none">
              Voir dans l'admin →
            </a>
          </div>
        `,
      });
    } catch (e) {
      console.error("[cancel-email-retry] Admin notif also failed:", e);
    }
  }

  return { ok: false, attempts: 3, last_error: lastError };
}

/**
 * Email client pour remboursement partiel.
 * Inline (pas de template dédié) car le cas est suffisamment simple.
 */
async function sendRefundPartialEmail(opts: {
  email:        string;
  prenom:       string;
  order_number: string;
  amount:       number;
  reason:       string | null;
}): Promise<boolean> {
  const numero = opts.order_number.slice(0,8).toUpperCase();
  const reasonBlock = opts.reason
    ? `<div style="background:#2a2018;border-radius:14px;padding:18px;margin:18px 0">
         <div style="font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#c49a4a;margin-bottom:6px">Motif</div>
         <div style="color:#f2ede6;font-size:14px;line-height:1.6;white-space:pre-wrap">${opts.reason.replace(/[<>&]/g, c => ({"<":"&lt;",">":"&gt;","&":"&amp;"} as any)[c])}</div>
       </div>`
    : "";

  try {
    const { error } = await resend.emails.send({
      from:    "M!LK <contact@milkbebe.fr>",
      to:      opts.email,
      subject: `Remboursement partiel — commande #${numero}`,
      html: `<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#1a1410;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px">
    <div style="text-align:center;margin-bottom:32px">
      <div style="display:inline-block;background:#c49a4a;border-radius:12px;padding:14px 28px">
        <span style="color:#1a1410;font-weight:950;font-size:24px;letter-spacing:-1px">M!LK</span>
      </div>
    </div>
    <div style="background:#2a2018;border-radius:20px;padding:32px;border:1px solid rgba(242,237,230,0.08)">
      <h1 style="margin:0 0 14px;color:#f2ede6;font-size:22px;font-weight:950;letter-spacing:-0.5px">
        ${opts.prenom ? `${opts.prenom}, un` : "Un"} remboursement partiel a été effectué
      </h1>
      <p style="margin:0 0 14px;color:rgba(242,237,230,0.7);font-size:15px;line-height:1.7">
        Sur votre commande <strong style="color:#f2ede6">#${numero}</strong>, nous venons de procéder à un remboursement de :
      </p>
      <div style="text-align:center;margin:22px 0">
        <span style="display:inline-block;background:#c49a4a;color:#1a1410;font-weight:950;font-size:28px;padding:14px 28px;border-radius:14px">
          ${opts.amount.toFixed(2)} €
        </span>
      </div>
      ${reasonBlock}
      <p style="margin:14px 0 0;color:rgba(242,237,230,0.55);font-size:13px;line-height:1.7">
        Le remboursement apparaîtra sur votre moyen de paiement initial sous <strong style="color:#f2ede6">3 à 5 jours ouvrés</strong>.
        Pour toute question : <a href="mailto:contact@milkbebe.fr" style="color:#c49a4a;font-weight:700">contact@milkbebe.fr</a>
      </p>
    </div>
    <div style="text-align:center;margin-top:24px;color:rgba(242,237,230,0.2);font-size:12px">
      M!LK — Essentiels bébé en bambou premium
    </div>
  </div>
</body>
</html>`,
    });
    return !error;
  } catch {
    return false;
  }
}

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
    if (order.status === "remboursee" || order.shipping_status === "annulee") {
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

    // 3b. Annuler le shipment Sendcloud (best-effort, ne bloque pas)
    const sendcloudCancel = await cancelSendcloudShipment(orderId, order.sendcloud_parcel_id ?? null);

    // 4. Update Supabase — EN 2 ÉTAPES pour ne pas tout perdre si certaines
    // colonnes optionnelles n'existent pas en base (refund_id, refunded_at, etc.).
    //
    // Étape 1 (GARANTI) — colonnes qui existent à coup sûr (status + shipping_status)
    const { error: updateErr1 } = await supabaseServer.from("orders").update({
      status:          "remboursee",
      shipping_status: "annulee",
    }).eq("id", orderId);
    if (updateErr1) {
      console.error("[commandes/cancel] Supabase update statuts:", updateErr1.message);
      // Stripe a déjà remboursé — on retourne l'erreur mais le refund reste valide
      return Response.json({
        error:           "Refund Stripe OK mais update Supabase a échoué",
        details:         updateErr1.message,
        refund_id:       refundId,
        refund_amount:   refundAmount,
        stock_restored:  stockResult.restored,
      }, { status: 500 });
    }

    // Étape 2 (BEST-EFFORT) — colonnes optionnelles. Si manquantes en base,
    // l'erreur est loggée mais ne bloque pas (les statuts sont déjà à jour).
    const { error: updateErr2 } = await supabaseServer.from("orders").update({
      refund_id:        refundId,
      refund_amount:    refundAmount,
      refunded_at:      new Date().toISOString(),
      cancelled_at:     new Date().toISOString(),
      cancelled_reason: body?.reason ?? null,
    }).eq("id", orderId);
    if (updateErr2) {
      console.warn("[commandes/cancel] Colonnes optionnelles non disponibles (refund_id, refunded_at, cancelled_at, cancelled_reason). Migration ALTER TABLE à exécuter:", updateErr2.message);
    }

    // 5. Envoyer email annulation au client (retry 3× + admin notif si fail)
    const emailResult = await sendCancellationEmailWithRetry({
      email:          order.customer_email,
      prenom:         order.customer_name?.split(" ")[0] ?? "",
      order_number:   orderId,
      custom_message: body?.custom_message ?? null,
      refund_amount:  refundAmount,
    });

    // 6. logActivity
    await logActivity("commande_annulee", `Commande #${orderId.slice(0,8)} annulée et remboursée (${refundAmount.toFixed(2)} €)`, {
      entity_id: orderId,
      meta: {
        refund_id:        refundId,
        refund_amount:    refundAmount,
        client_email:     order.customer_email,
        stock_restored:   stockResult.restored,
        stock_errors:     stockResult.errors,
        email_sent:       emailResult.ok,
        email_attempts:   emailResult.attempts,
        email_last_error: emailResult.last_error,
        sendcloud_cancel_ok:    sendcloudCancel.ok,
        sendcloud_cancel_error: sendcloudCancel.error,
      },
    });

    if (emailResult.ok) {
      await logActivity("commande_cancel_email_sent", `Email annulation envoyé pour #${orderId.slice(0,8)} (${emailResult.attempts} tentative${emailResult.attempts > 1 ? "s" : ""})`, {
        entity_id: orderId,
        meta: { attempts: emailResult.attempts, customer_email: order.customer_email },
      });
    }

    return Response.json({
      ok:                true,
      refund_id:         refundId,
      refund_amount:     refundAmount,
      stock_restored:    stockResult.restored,
      stock_errors:      stockResult.errors,
      email_sent:        emailResult.ok,
      email_attempts:    emailResult.attempts,
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
    const newStatus      = cumul >= Number(order.amount_total ?? 0) ? "remboursee" : "rembours_partiel";

    // Étape 1 — garanti : status seulement
    const { error: updateErr1 } = await supabaseServer.from("orders").update({
      status: newStatus,
    }).eq("id", orderId);
    if (updateErr1) {
      console.error("[commandes/refund_partial] Supabase update status:", updateErr1.message);
      return Response.json({
        error:         "Refund partiel Stripe OK mais update Supabase a échoué",
        details:       updateErr1.message,
        refund_id:     refund.id,
        amount,
      }, { status: 500 });
    }

    // Étape 2 — best-effort : colonnes optionnelles
    const { error: updateErr2 } = await supabaseServer.from("orders").update({
      refund_id:     refund.id,
      refund_amount: cumul,
      refunded_at:   new Date().toISOString(),
    }).eq("id", orderId);
    if (updateErr2) {
      console.warn("[commandes/refund_partial] Colonnes optionnelles non disponibles. ALTER TABLE à exécuter:", updateErr2.message);
    }

    // Si le cumul atteint le total → annulation totale via remboursements
    // partiels successifs. On annule aussi le shipment Sendcloud et on
    // bascule shipping_status à "annulee" pour cohérence UI.
    let sendcloudCancel: { ok: boolean; error: string | null } = { ok: true, error: null };
    if (newStatus === "remboursee") {
      sendcloudCancel = await cancelSendcloudShipment(orderId, order.sendcloud_parcel_id ?? null);
      await supabaseServer.from("orders")
        .update({ shipping_status: "annulee" })
        .eq("id", orderId);
    }

    // Envoyer email client (best-effort, sans retry — le contexte est moins
    // critique que cancel_refund car la commande reste valide)
    let emailSent = false;
    if (order.customer_email) {
      emailSent = await sendRefundPartialEmail({
        email:        order.customer_email,
        prenom:       order.customer_name?.split(" ")[0] ?? "",
        order_number: orderId,
        amount,
        reason:       body?.reason ?? null,
      });
    }

    await logActivity("commande_remboursee_partielle", `Remboursement partiel ${amount.toFixed(2)} € sur #${orderId.slice(0,8)}`, {
      entity_id: orderId,
      meta: {
        refund_id:   refund.id,
        amount,
        cumul,
        reason:      body?.reason ?? null,
        email_sent:  emailSent,
        client_email: order.customer_email,
        sendcloud_cancel_ok:    sendcloudCancel.ok,
        sendcloud_cancel_error: sendcloudCancel.error,
      },
    });

    return Response.json({ ok: true, refund_id: refund.id, amount, cumul, email_sent: emailSent });
  }

  // === ACTION: mark_delivered ===
  if (action === "mark_delivered") {
    // Étape 1 — garanti
    const { error: updateErr1 } = await supabaseServer.from("orders").update({
      shipping_status: "livree",
    }).eq("id", orderId);
    if (updateErr1) {
      console.error("[commandes/mark_delivered] Supabase update:", updateErr1.message);
      return Response.json({ error: updateErr1.message }, { status: 500 });
    }

    // Étape 2 — best-effort (colonne delivered_at peut ne pas exister)
    const { error: updateErr2 } = await supabaseServer.from("orders").update({
      delivered_at: new Date().toISOString(),
    }).eq("id", orderId);
    if (updateErr2) {
      console.warn("[commandes/mark_delivered] delivered_at non disponible:", updateErr2.message);
    }

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
