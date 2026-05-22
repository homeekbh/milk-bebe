import Stripe from "stripe";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/server/supabase";
import { Resend } from "resend";
import { logActivity } from "@/lib/server/audit";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const resend  = new Resend(process.env.RESEND_API_KEY);
const BASE    = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

const ADMIN_EMAILS = [
  process.env.ADMIN_EMAIL_1,
  process.env.ADMIN_EMAIL_2,
  process.env.ADMIN_EMAIL_3,
].filter(Boolean) as string[];

function extractTailleFromName(name: string): string | null {
  if (!name) return null;
  const parts = name.split(" — ");
  if (parts.length < 2) return null;
  const last = parts[parts.length - 1].trim();
  const taillePatterns = [
    /^Nouveau-né$/i,
    /^\d+-\d+\s*mois$/i,
    /^0-6\s*mois$/i,
    /^6-12\s*mois$/i,
    /^Taille unique$/i,
    /^\d+×\d+\s*cm$/i,
    /^Naissance$/i,
  ];
  if (taillePatterns.some(p => p.test(last))) return last;
  return null;
}

export async function POST(req: Request) {
  const body        = await req.text();
  const headersList = await headers();
  const sig         = headersList.get("stripe-signature");

  if (!sig) return new Response("Missing stripe signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    process.env.NODE_ENV !== "production" && console.error("❌ Webhook signature error:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    process.env.NODE_ENV !== "production" && console.log("✅ Webhook received:", session.id);

    try {
      const items     = JSON.parse(session.metadata?.items ?? "[]");
      const promoCode = session.metadata?.promo_code || null;
      const discount  = parseFloat(session.metadata?.discount ?? "0");
      const email     = session.customer_details?.email ?? "";
      const name      = session.customer_details?.name  ?? "";
      const amount    = (session.amount_total ?? 0) / 100;

      const sessionAny   = session as any;
      const shippingAddr = sessionAny.shipping_details?.address ?? session.customer_details?.address ?? null;
      const shippingName = sessionAny.shipping_details?.name ?? name;
      const shippingAddress = shippingAddr ? {
        name:        shippingName,
        line1:       shippingAddr.line1       ?? "",
        line2:       shippingAddr.line2       ?? "",
        city:        shippingAddr.city        ?? "",
        postal_code: shippingAddr.postal_code ?? "",
        country:     shippingAddr.country     ?? "FR",
      } : null;

      // ── Mode de livraison (Mondial Relay) ───────────────────────────────
      const deliveryType  = session.metadata?.delivery_type ?? null;
      const deliveryPrice = parseFloat(session.metadata?.delivery_price ?? "0") || 0;
      const relayId       = session.metadata?.relay_id          || null;
      const relayName     = session.metadata?.relay_name        || null;
      const relayStreet   = session.metadata?.relay_street      || null;
      const relayCity     = session.metadata?.relay_city        || null;
      const relayCp       = session.metadata?.relay_postal_code || null;
      const relayType     = session.metadata?.relay_type        || null;

      let homeAddrParsed: any = null;
      try { homeAddrParsed = JSON.parse(session.metadata?.home_address ?? ""); } catch {}

      // Si home_address fourni côté UI → on l'utilise comme shipping_address
      const finalShippingAddress = homeAddrParsed
        ? { ...homeAddrParsed, line2: homeAddrParsed.line2 ?? "" }
        : shippingAddress;

      const { data: orderData, error: orderError } = await supabaseServer
        .from("orders")
        .upsert([{
          stripe_session_id: session.id,
          items,
          amount_total:      amount,
          customer_email:    email,
          customer_name:     name,
          promo_code:        promoCode,
          discount,
          status:            "paid",
          shipping_status:   "pending",
          shipping_address:  finalShippingAddress,
          delivery_type:     deliveryType,
          delivery_price:    deliveryPrice,
          relay_id:          relayId,
          relay_name:        relayName,
          relay_address:     relayStreet,
          relay_city:        relayCity,
          relay_postal_code: relayCp,
          relay_type:        relayType,
        }], { onConflict: "stripe_session_id", ignoreDuplicates: false })
        .select()
        .single();

      if (orderError) {
        process.env.NODE_ENV !== "production" && console.error("❌ Order upsert error:", orderError.message);
      } else {
        process.env.NODE_ENV !== "production" && console.log("✅ Order saved:", orderData?.id);
      }

      // ✅ Batch load produits — 1 requête au lieu de N
      const _itemIds   = [...new Set(items.map((i: any) => i.id).filter(Boolean))];
      const _itemSlugs = [...new Set(items.map((i: any) => i.slug).filter(Boolean))];
      const { data: _allProds } = await supabaseServer
        .from("products").select("id, stock, slug, sizes_stock")
        .in("id", _itemIds.length ? _itemIds : ["none"]);
      const { data: _allProds2 } = _itemSlugs.length
        ? await supabaseServer.from("products").select("id, stock, slug, sizes_stock").in("slug", _itemSlugs)
        : { data: [] };
      const _prodsMap: Record<string, any> = {};
      [...(_allProds ?? []), ...(_allProds2 ?? [])].forEach((p: any) => {
        _prodsMap[p.id]   = p;
        _prodsMap[p.slug] = p;
      });

      for (const item of items) {
        let productData: any = _prodsMap[item.id] ?? _prodsMap[item.slug] ?? null;
        const _skip = false; // batch loaded

        // slug fallback already in batch

        if (!productData) {
          console.warn("⚠️ Product not found for item:", item);
          continue;
        }

        const qty = item.quantity ?? 1;
        const newStock = Math.max(0, (productData.stock ?? 0) - qty);
        const updatePayload: Record<string, any> = { stock: newStock };

        const taille = extractTailleFromName(item.name ?? "");
        if (taille) {
          const currentSizesStock: Record<string, number> = productData.sizes_stock ?? {};
          const currentTailleStock = currentSizesStock[taille] ?? 0;
          const newTailleStock     = Math.max(0, currentTailleStock - qty);
          updatePayload.sizes_stock = {
            ...currentSizesStock,
            [taille]: newTailleStock,
          };
          process.env.NODE_ENV !== "production" && console.log(`✅ sizes_stock[${taille}]: ${currentTailleStock} → ${newTailleStock}`);
        } else {
          process.env.NODE_ENV !== "production" && console.log(`ℹ️ Pas de taille identifiée pour "${item.name}" — stock global uniquement`);
        }

        const { error: stockError } = await supabaseServer
          .from("products")
          .update(updatePayload)
          .eq("id", productData.id);

        if (stockError) {
          process.env.NODE_ENV !== "production" && console.error("❌ Stock update error:", productData.slug, stockError.message);
        } else {
          process.env.NODE_ENV !== "production" && console.log(`✅ Stock updated: ${productData.slug} → global: ${newStock}`);
        }
      }

      if (promoCode) {
        const { data: promo } = await supabaseServer
          .from("promo_codes").select("id, uses_count").eq("code", promoCode).single();
        if (promo) {
          await supabaseServer
            .from("promo_codes")
            .update({ uses_count: (promo.uses_count ?? 0) + 1 })
            .eq("id", promo.id);
        }
      }

      if (email) {
        await supabaseServer
          .from("abandoned_carts")
          .update({ converted: true })
          .eq("email", email.toLowerCase().trim());
      }

      if (email && orderData) {
        try {
          await fetch(`${BASE}/api/emails/confirmation`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_EMAIL_SECRET ?? "" },
            body: JSON.stringify({
              to:               email,
              email,
              customer_name:    name,
              items,
              amount_total:     amount,
              order_id:         orderData.id,
              shipping_address: finalShippingAddress,
              promo_code:       promoCode,
              discount,
              delivery_type:    deliveryType,
              relay:            relayId ? {
                id:          relayId,
                name:        relayName,
                street:      relayStreet,
                city:        relayCity,
                postal_code: relayCp,
                type:        relayType,
              } : null,
              home_address:     homeAddrParsed,
            }),
          });
        } catch (e) {
          process.env.NODE_ENV !== "production" && console.error("❌ Confirmation email error:", e);
        }
      }

      if (orderData && ADMIN_EMAILS.length > 0) {
        const itemsHtml = items.map((i: any) =>
          `<div style="font-size:14px;color:rgba(242,237,230,0.65);margin-top:6px">
            ${i.name ?? i.slug} × ${i.quantity} — ${(Number(i.price) * i.quantity).toFixed(2)} €
          </div>`
        ).join("");

        for (const adminEmail of ADMIN_EMAILS) {
          try {
            await resend.emails.send({
              from:    "M!LK <contact@milkbebe.fr>",
              to:      adminEmail,
              subject: `🛍️ Nouvelle vente M!LK — ${amount.toFixed(2)} € — ${name || email}`,
              html: `
                <div style="background:#1a1410;font-family:Arial,sans-serif;padding:32px;border-radius:16px;max-width:520px">
                  <div style="background:#c49a4a;border-radius:12px;padding:14px 20px;margin-bottom:24px;text-align:center">
                    <span style="color:#1a1410;font-weight:950;font-size:20px">M!LK — Nouvelle commande</span>
                  </div>
                  <div style="background:#2a2018;border-radius:14px;padding:20px;margin-bottom:14px">
                    <div style="font-size:15px;font-weight:800;color:#f2ede6">${name || "Client"}</div>
                    <div style="font-size:13px;color:rgba(242,237,230,0.5);margin-top:3px">${email}</div>
                    ${shippingAddress ? `<div style="font-size:12px;color:rgba(242,237,230,0.4);margin-top:8px">${shippingAddress.line1}, ${shippingAddress.city} ${shippingAddress.postal_code}</div>` : ""}
                  </div>
                  <div style="background:#2a2018;border-radius:14px;padding:20px;margin-bottom:14px">
                    ${itemsHtml}
                    <div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(196,154,74,0.2);font-size:22px;font-weight:950;color:#c49a4a;text-align:right">${amount.toFixed(2)} €</div>
                  </div>
                  <a href="${BASE}/admin/commandes" style="display:block;text-align:center;background:#f2ede6;color:#1a1410;padding:14px;border-radius:10px;font-weight:900;font-size:15px;text-decoration:none">
                    Voir dans l'admin →
                  </a>
                </div>
              `,
            });
          } catch (e) {
            process.env.NODE_ENV !== "production" && console.error("❌ Admin notification error:", e);
          }
        }
      }

    } catch (err: any) {
      process.env.NODE_ENV !== "production" && console.error("❌ Webhook processing error:", err.message);
      return new Response(`Processing error: ${err.message}`, { status: 500 });
    }
  }

  // ── payment_intent.payment_failed — paiement échoué ──────────────────────
  // On marque la commande en "payment_failed" pour la suivre côté admin.
  // Stock NON décrémenté (le webhook checkout.session.completed n'a pas été
  // déclenché car le paiement n'est jamais allé jusqu'au bout) → rien à
  // réintégrer.
  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object as Stripe.PaymentIntent;
    process.env.NODE_ENV !== "production" && console.error("⚠️ Payment failed:", pi.id, pi.last_payment_error?.message);

    try {
      // On essaie de retrouver la commande via stripe_payment_intent_id si stocké,
      // sinon via le stripe_session_id en remontant à la session (paiement échoué
      // = il peut quand même y avoir une session associée).
      let order: any = null;

      // Première tentative : colonne stripe_payment_intent_id si elle existe
      const { data: byPi } = await supabaseServer
        .from("orders").select("id, amount_total, customer_email, stripe_session_id")
        .eq("stripe_payment_intent_id", pi.id).maybeSingle();
      if (byPi) order = byPi;

      // Deuxième tentative : remonter via la session liée à ce payment_intent
      if (!order) {
        try {
          const sessions = await stripe.checkout.sessions.list({ payment_intent: pi.id, limit: 1 });
          const sid = sessions.data[0]?.id;
          if (sid) {
            const { data: bySid } = await supabaseServer
              .from("orders").select("id, amount_total, customer_email, stripe_session_id")
              .eq("stripe_session_id", sid).maybeSingle();
            if (bySid) order = bySid;
          }
        } catch {}
      }

      if (order) {
        await supabaseServer.from("orders").update({
          status: "payment_failed",
        }).eq("id", order.id);

        await logActivity(
          "commande_echec_paiement",
          `Paiement échoué pour commande #${String(order.id).slice(0, 8).toUpperCase()}`,
          {
            entity_id: order.id,
            meta: {
              payment_intent_id: pi.id,
              error_code:        pi.last_payment_error?.code ?? null,
              error_message:     pi.last_payment_error?.message ?? null,
              amount:            (pi.amount ?? 0) / 100,
              customer_email:    order.customer_email,
            },
          }
        );
      } else {
        // Aucune commande retrouvée (cas normal : la session n'a jamais été completée,
        // donc l'order n'existe pas en base). On log quand même l'événement.
        await logActivity(
          "commande_echec_paiement",
          `Paiement échoué (aucune commande associée) — PI ${pi.id}`,
          {
            meta: {
              payment_intent_id: pi.id,
              error_code:        pi.last_payment_error?.code ?? null,
              error_message:     pi.last_payment_error?.message ?? null,
              amount:            (pi.amount ?? 0) / 100,
            },
          }
        );
      }
    } catch (err: any) {
      process.env.NODE_ENV !== "production" && console.error("❌ payment_intent.payment_failed handler:", err.message);
      // On ne return pas 500 — l'événement est ack
    }
  }

  // ── charge.refunded — remboursement Stripe (manuel dashboard ou via API) ─
  // Cet événement est déclenché APRÈS création d'un refund. Couvre :
  //  - Refunds créés via notre /api/admin/commandes/[id] (action cancel_refund/refund_partial)
  //  - Refunds créés manuellement dans le Stripe Dashboard
  //  - Refunds automatiques (chargeback, etc.)
  // On met le statut à "refunded" et on log.
  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    process.env.NODE_ENV !== "production" && console.log("💸 Charge refunded:", charge.id, charge.amount_refunded);

    try {
      const piId = typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id ?? null;

      let order: any = null;

      if (piId) {
        // Tentative via stripe_payment_intent_id si stocké
        const { data: byPi } = await supabaseServer
          .from("orders").select("id, amount_total, customer_email, stripe_session_id, status")
          .eq("stripe_payment_intent_id", piId).maybeSingle();
        if (byPi) order = byPi;

        // Fallback : remonter via la session
        if (!order) {
          try {
            const sessions = await stripe.checkout.sessions.list({ payment_intent: piId, limit: 1 });
            const sid = sessions.data[0]?.id;
            if (sid) {
              const { data: bySid } = await supabaseServer
                .from("orders").select("id, amount_total, customer_email, stripe_session_id, status")
                .eq("stripe_session_id", sid).maybeSingle();
              if (bySid) order = bySid;
            }
          } catch {}
        }
      }

      const refundAmount = (charge.amount_refunded ?? 0) / 100;

      if (order) {
        // Ne pas écraser si déjà refunded (évite race condition avec notre endpoint admin)
        const alreadyRefunded = String(order.status ?? "").toLowerCase() === "refunded";
        if (!alreadyRefunded) {
          await supabaseServer.from("orders").update({
            status:        "refunded",
            refund_amount: refundAmount,
            refunded_at:   new Date().toISOString(),
          }).eq("id", order.id);
        }

        await logActivity(
          "commande_remboursee",
          `Commande #${String(order.id).slice(0, 8).toUpperCase()} remboursée — ${refundAmount.toFixed(2)} €`,
          {
            entity_id: order.id,
            meta: {
              charge_id:         charge.id,
              payment_intent_id: piId,
              amount_refunded:   refundAmount,
              currency:          charge.currency,
              customer_email:    order.customer_email,
              source:            alreadyRefunded ? "stripe_webhook_after_admin_action" : "stripe_webhook",
            },
          }
        );
      } else {
        // Aucune commande retrouvée — on log quand même
        await logActivity(
          "commande_remboursee",
          `Remboursement reçu (aucune commande associée) — ${refundAmount.toFixed(2)} €`,
          {
            meta: {
              charge_id:         charge.id,
              payment_intent_id: piId,
              amount_refunded:   refundAmount,
            },
          }
        );
      }
    } catch (err: any) {
      process.env.NODE_ENV !== "production" && console.error("❌ charge.refunded handler:", err.message);
    }
  }

  return new Response("OK", { status: 200 });
}