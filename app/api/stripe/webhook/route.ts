import Stripe from "stripe";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/server/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const body        = await req.text();
  const headersList = await headers();
  const sig         = headersList.get("stripe-signature");

  if (!sig) return new Response("Missing stripe signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error("Webhook signature error:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      const items         = JSON.parse(session.metadata?.items   ?? "[]");
      const promo_code    = session.metadata?.promo_code          || null;
      const discount      = parseFloat(session.metadata?.discount ?? "0");
      const customerEmail = session.customer_details?.email       ?? session.customer_email ?? "";
      const customerName  = session.customer_details?.name        ?? "";
      const amountTotal   = (session.amount_total ?? 0) / 100;

      // ✅ Enregistrer la commande
      const { data: orderData, error: orderError } = await supabaseServer
        .from("orders").insert([{
          stripe_session_id: session.id,
          items,
          amount_total:   amountTotal,
          customer_email: customerEmail,
          customer_name:  customerName,
          promo_code:     promo_code,
          discount:       discount,
          status:         "paid",
        }]).select().single();

      if (orderError && !orderError.message.includes("unique")) {
        console.error("Order insert error:", orderError.message);
      }

      // ✅ Décrémenter le stock
      for (const item of items) {
        const { data: product } = await supabaseServer
          .from("products").select("stock").eq("id", item.id).single();
        if (!product) continue;
        const newStock = Math.max(0, (product.stock ?? 0) - (item.quantity ?? 1));
        await supabaseServer.from("products").update({ stock: newStock }).eq("id", item.id);
      }

      // ✅ Incrémenter uses_count du code promo
      if (promo_code) {
        const { data: promo } = await supabaseServer
          .from("promo_codes").select("id, uses_count").eq("code", promo_code).single();
        if (promo) {
          await supabaseServer.from("promo_codes")
            .update({ uses_count: (promo.uses_count ?? 0) + 1 })
            .eq("id", promo.id);
        }
      }

      // ✅ Marquer le panier abandonné comme converti
      if (customerEmail) {
        await supabaseServer.from("abandoned_carts")
          .update({ converted: true })
          .eq("email", customerEmail.toLowerCase().trim());
      }

      // ✅ Envoyer email de confirmation
      if (customerEmail && orderData) {
        const prenom = customerName.split(" ")[0] ?? "";
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/emails/confirmation`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            email:        customerEmail,
            prenom,
            items,
            amount_total: amountTotal,
            order_id:     orderData.id,
          }),
        }).catch(e => console.error("Email confirmation fetch error:", e));
      }

    } catch (error) {
      console.error("Webhook processing error:", error);
      return new Response("Processing failed", { status: 500 });
    }
  }

  return new Response("OK", { status: 200 });
}