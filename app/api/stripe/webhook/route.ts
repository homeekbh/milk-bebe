import Stripe from "stripe";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/server/supabase";
import { Resend } from "resend";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const resend  = new Resend(process.env.RESEND_API_KEY);
const BASE    = process.env.NEXT_PUBLIC_BASE_URL ?? "https://milk-bebe.vercel.app";

// ✅ Emails de notification pour Bou + Erika
const ADMIN_EMAILS = [
  process.env.ADMIN_EMAIL_1,
  process.env.ADMIN_EMAIL_2,
  process.env.ADMIN_EMAIL_3,
].filter(Boolean) as string[];

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
      const items      = JSON.parse(session.metadata?.items ?? "[]");
      const promoCode  = session.metadata?.promo_code || null;
      const discount   = parseFloat(session.metadata?.discount ?? "0");
      const email      = session.customer_details?.email ?? "";
      const name       = session.customer_details?.name  ?? "";
      const amount     = (session.amount_total ?? 0) / 100;

      // ✅ Adresse de livraison depuis Stripe
      const shippingAddr = session.shipping_details?.address ?? session.customer_details?.address ?? null;
      const shippingName = session.shipping_details?.name    ?? name;

      const shippingAddress = shippingAddr ? {
        name:        shippingName,
        line1:       shippingAddr.line1        ?? "",
        line2:       shippingAddr.line2        ?? "",
        city:        shippingAddr.city         ?? "",
        postal_code: shippingAddr.postal_code  ?? "",
        country:     shippingAddr.country      ?? "FR",
      } : null;

      // ✅ Enregistrer la commande
      const { data: orderData, error: orderError } = await supabaseServer
        .from("orders")
        .insert([{
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
        }])
        .select()
        .single();

      if (orderError) {
        if (orderError.message.includes("unique")) {
          console.log("ℹ️ Order already exists:", session.id);
        } else {
          console.error("❌ Order insert error:", orderError.message);
        }
      } else {
        console.log("✅ Order saved:", orderData?.id);
      }

      // ✅ Décrémenter le stock
      for (const item of items) {
        const { data: product } = await supabaseServer
          .from("products").select("stock").eq("id", item.id).single();
        if (!product) continue;
        const newStock = Math.max(0, (product.stock ?? 0) - (item.quantity ?? 1));
        await supabaseServer.from("products").update({ stock: newStock }).eq("id", item.id);
      }

      // ✅ Incrémenter uses_count code promo
      if (promoCode) {
        const { data: promo } = await supabaseServer
          .from("promo_codes").select("id, uses_count").eq("code", promoCode).single();
        if (promo) {
          await supabaseServer.from("promo_codes")
            .update({ uses_count: (promo.uses_count ?? 0) + 1 })
            .eq("id", promo.id);
        }
      }

      // ✅ Marquer panier abandonné comme converti
      if (email) {
        await supabaseServer.from("abandoned_carts")
          .update({ converted: true })
          .eq("email", email.toLowerCase().trim());
      }

      // ✅ Email confirmation client
      if (email && orderData) {
        const prenom = name.split(" ")[0] ?? "";
        await fetch(`${BASE}/api/emails/confirmation`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            email, prenom, items,
            amount_total: amount,
            order_id:     orderData.id,
            shipping_address: shippingAddress,
          }),
        }).catch(e => console.error("❌ Email confirmation error:", e));
      }

      // ✅ Notification email Bou + Erika
      if (orderData) {
        const itemsText = items.map((i: any) => `• ${i.name} ×${i.quantity} — ${(i.price * i.quantity).toFixed(2)} €`).join("\n");
        const addrText  = shippingAddress
          ? `${shippingAddress.name}\n${shippingAddress.line1}${shippingAddress.line2 ? "\n" + shippingAddress.line2 : ""}\n${shippingAddress.postal_code} ${shippingAddress.city}\n${shippingAddress.country}`
          : "Non renseignée";

        const html = `
<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#1a1410;font-family:sans-serif">
<div style="max-width:500px;margin:0 auto;padding:32px 20px">
  <div style="background:#c49a4a;border-radius:12px;padding:14px 20px;margin-bottom:24px;text-align:center">
    <span style="color:#1a1410;font-weight:950;font-size:22px">M!LK — Nouvelle vente !</span>
  </div>
  <div style="background:#2a2018;border-radius:16px;border:1px solid rgba(242,237,230,0.1);padding:24px;margin-bottom:16px">
    <div style="font-size:13px;color:rgba(242,237,230,0.4);margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">Client</div>
    <div style="font-size:18px;font-weight:800;color:#f2ede6">${name || "—"}</div>
    <div style="font-size:14px;color:rgba(242,237,230,0.5);margin-top:4px">${email}</div>
  </div>
  <div style="background:#2a2018;border-radius:16px;border:1px solid rgba(242,237,230,0.1);padding:24px;margin-bottom:16px">
    <div style="font-size:13px;color:rgba(242,237,230,0.4);margin-bottom:10px;text-transform:uppercase;letter-spacing:1px">Articles</div>
    <pre style="margin:0;color:#f2ede6;font-size:14px;line-height:1.8;white-space:pre-wrap">${itemsText}</pre>
    <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(196,154,74,0.2);font-size:24px;font-weight:950;color:#c49a4a;text-align:right">${amount.toFixed(2)} €</div>
  </div>
  <div style="background:#2a2018;border-radius:16px;border:1px solid rgba(242,237,230,0.1);padding:24px;margin-bottom:24px">
    <div style="font-size:13px;color:rgba(242,237,230,0.4);margin-bottom:10px;text-transform:uppercase;letter-spacing:1px">Adresse de livraison</div>
    <pre style="margin:0;color:#f2ede6;font-size:14px;line-height:1.8;white-space:pre-wrap">${addrText}</pre>
  </div>
  <a href="${BASE}/admin/commandes" style="display:block;text-align:center;background:#f2ede6;color:#1a1410;padding:14px;border-radius:12px;font-weight:900;font-size:15px;text-decoration:none">
    Voir dans l'admin →
  </a>
</div>
</body>
</html>`;

        for (const adminEmail of ADMIN_EMAILS) {
          await resend.emails.send({
            from:    "M!LK Admin <bonjour@milk-bebe.fr>",
            to:      adminEmail,
            subject: `🛍️ Nouvelle vente M!LK — ${amount.toFixed(2)} € — ${name || email}`,
            html,
          }).catch(e => console.error("❌ Admin notification error:", e));
        }
      }

    } catch (error) {
      console.error("❌ Webhook processing error:", error);
      return new Response("Processing failed", { status: 500 });
    }
  }

  return new Response("OK", { status: 200 });
}