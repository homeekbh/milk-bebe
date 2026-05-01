import Stripe from "stripe";
import { supabaseServer } from "@/lib/server/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// ── Extrait la taille depuis le nom de l'article (même logique que le webhook)
// Ex: "Body éclairs — 0-3 mois" → "0-3 mois"
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
  try {
    const { items, promo_code, discount, free_shipping } = await req.json();

    if (!items || items.length === 0) {
      return Response.json({ error: "Panier vide" }, { status: 400 });
    }

    const lineItems      = [];
    const validatedItems = [];

    for (const item of items) {
      const { data: product } = await supabaseServer
        .from("products").select("*").eq("id", item.id).single();

      if (!product) {
        return Response.json({ error: `Produit introuvable : ${item.id}` }, { status: 400 });
      }

      const qty = item.quantity ?? 1;

      // ── Vérification stock global
      if ((product.stock ?? 0) < qty) {
        return Response.json({ error: `Stock insuffisant pour ${product.name}` }, { status: 400 });
      }

      // ── Vérification stock par taille si applicable
      const taille = extractTailleFromName(item.name ?? "");
      if (taille) {
        const sizesStock: Record<string, number> = product.sizes_stock ?? {};
        const stockPourTaille = sizesStock[taille] ?? 0;
        if (stockPourTaille < qty) {
          return Response.json({
            error: `La taille "${taille}" n'est plus disponible pour ${product.name}. Veuillez choisir une autre taille.`,
          }, { status: 400 });
        }
      }

      // ── Prix : promo active ?
      const now           = new Date();
      const isPromoActive = product.promo_price && product.promo_start && product.promo_end &&
        new Date(product.promo_start) <= now && new Date(product.promo_end) >= now;
      const finalPrice    = isPromoActive ? product.promo_price : product.price_ttc;

      // ── Nom affiché dans Stripe : inclure la taille pour la préparation commande
      const displayName = item.name ?? product.name;

      lineItems.push({
        price_data: {
          currency:     "eur",
          product_data: {
            name: displayName,
            ...(product.image_url ? { images: [product.image_url] } : {}),
          },
          unit_amount: Math.round(finalPrice * 100),
        },
        quantity: qty,
      });

      validatedItems.push({
        id:            product.id,
        name:          displayName,   // ← inclut la taille, ex: "Body éclairs — 0-3 mois"
        slug:          product.slug,
        price:         finalPrice,
        quantity:      qty,
        category_slug: product.category_slug ?? "",
        taille:        taille ?? null,  // champ structuré pour Sendcloud + admin
      });
    }

    // ── Livraison
    const subtotal        = lineItems.reduce((s, l) => s + l.price_data.unit_amount * l.quantity, 0) / 100;
    const hasFreeShipping = free_shipping || subtotal >= 60;
    if (!hasFreeShipping) {
      lineItems.push({
        price_data: {
          currency:     "eur",
          product_data: { name: "Livraison" },
          unit_amount:  490,
        },
        quantity: 1,
      });
    }

    const sessionParams: any = {
      payment_method_types: ["card"],
      line_items:           lineItems,
      mode:                 "payment",
      shipping_address_collection: {
        allowed_countries: ["FR", "BE", "CH", "LU", "MC"],
      },
      billing_address_collection: "auto",
      customer_creation:          "always",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.NEXT_PUBLIC_BASE_URL}/panier`,
      locale:      "fr",
      metadata: {
        items:         JSON.stringify(validatedItems),
        promo_code:    promo_code    ?? "",
        discount:      String(discount   ?? 0),
        free_shipping: String(free_shipping ?? false),
      },
    };

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