import Stripe from "stripe";
import { supabaseServer } from "@/lib/server/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, promo_code, discount, free_shipping } = body;

    if (!items || items.length === 0) {
      return Response.json({ error: "Panier vide" }, { status: 400 });
    }

    const lineItems = [];
    const validatedItems = [];

    for (const item of items) {
      const { data: product } = await supabaseServer
        .from("products").select("*").eq("id", item.id).single();

      if (!product) {
        return Response.json({ error: `Produit introuvable : ${item.id}` }, { status: 400 });
      }

      if ((product.stock ?? 0) < (item.quantity ?? 1)) {
        return Response.json({ error: `Stock insuffisant pour ${product.name}` }, { status: 400 });
      }

      const now = new Date();
      const isPromoActive =
        product.promo_price &&
        product.promo_start && product.promo_end &&
        new Date(product.promo_start) <= now &&
        new Date(product.promo_end) >= now;

      const finalPrice = isPromoActive ? product.promo_price : product.price_ttc;

      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: product.name,
            ...(product.image_url ? { images: [product.image_url] } : {}),
          },
          unit_amount: Math.round(finalPrice * 100),
        },
        quantity: item.quantity,
      });

      validatedItems.push({
        id:           product.id,
        name:         product.name,
        slug:         product.slug,
        price:        finalPrice,
        quantity:     item.quantity,
        category_slug: product.category_slug ?? "",
      });
    }

    // Livraison
    const shippingTotal = lineItems.reduce((s, l) =>
      s + (l.price_data.unit_amount * l.quantity), 0) / 100;
    const hasFreeShipping = free_shipping || shippingTotal >= 60;

    if (!hasFreeShipping) {
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: { name: "Livraison" },
          unit_amount: 490,
        },
        quantity: 1,
      });
    }

    // Coupon Stripe si code promo avec réduction monétaire
    const sessionParams: any = {
      payment_method_types: ["card"],
      line_items:           lineItems,
      mode:                 "payment",
      success_url:          `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:           `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/panier`,
      billing_address_collection: "auto",
      metadata: {
        items:        JSON.stringify(validatedItems),
        promo_code:   promo_code   ?? "",
        discount:     String(discount ?? 0),
        free_shipping: String(free_shipping ?? false),
      },
    };

    // Appliquer coupon Stripe si réduction > 0
    if (discount && discount > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: Math.round(Number(discount) * 100),
        currency:   "eur",
        duration:   "once",
        name:       `Code ${promo_code}`,
      });
      sessionParams.discounts = [{ coupon: coupon.id }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return Response.json({ url: session.url });

  } catch (error: any) {
    console.error("Checkout error:", error);
    return Response.json({ error: error.message ?? "Erreur serveur" }, { status: 500 });
  }
}