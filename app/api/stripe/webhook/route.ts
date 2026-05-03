import Stripe from "stripe";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/server/supabase";
import { Resend } from "resend";

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
    console.error("❌ Webhook signature error:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    console.log("✅ Webhook received:", session.id);

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
          shipping_address:  shippingAddress,
        }], { onConflict: "stripe_session_id", ignoreDuplicates: false })
        .select()
        .single();

      if (orderError) {
        console.error("❌ Order upsert error:", orderError.message);
      } else {
        console.log("✅ Order saved:", orderData?.id);
      }

      for (const item of items) {
        let productData: any = null;

        if (item.id) {
          const { data } = await supabaseServer
            .from("products")
            .select("id, stock, slug, sizes_stock")
            .eq("id", item.id)
            .single();
          if (data) productData = data;
        }
        if (!productData && item.slug) {
          const { data } = await supabaseServer
            .from("products")
            .select("id, stock, slug, sizes_stock")
            .eq("slug", item.slug)
            .single();
          if (data) productData = data;
        }

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
          console.log(`✅ sizes_stock[${taille}]: ${currentTailleStock} → ${newTailleStock}`);
        } else {
          console.log(`ℹ️ Pas de taille identifiée pour "${item.name}" — stock global uniquement`);
        }

        const { error: stockError } = await supabaseServer
          .from("products")
          .update(updatePayload)
          .eq("id", productData.id);

        if (stockError) {
          console.error("❌ Stock update error:", productData.slug, stockError.message);
        } else {
          console.log(`✅ Stock updated: ${productData.slug} → global: ${newStock}`);
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
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to:               email,
              email,
              customer_name:    name,
              items,
              amount_total:     amount,
              order_id:         orderData.id,
              shipping_address: shippingAddress,
              promo_code:       promoCode,
              discount,
            }),
          });
        } catch (e) {
          console.error("❌ Confirmation email error:", e);
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
            console.error("❌ Admin notification error:", e);
          }
        }
      }

    } catch (err: any) {
      console.error("❌ Webhook processing error:", err.message);
      return new Response(`Processing error: ${err.message}`, { status: 500 });
    }
  }

  return new Response("OK", { status: 200 });
}