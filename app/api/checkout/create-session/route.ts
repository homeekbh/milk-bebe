import Stripe from "stripe";
import { supabaseServer } from "@/lib/server/supabase";
import {
  ALLOWED_CARRIERS,
  ALLOWED_DELIVERY_TYPES,
  isDeliveryCombinationAllowed,
  getDeliveryPrice,
  deliveryLabel,
  computeShipping,
} from "@/lib/delivery-config";
import { validatePromoCode } from "@/lib/promo-validate";

// Pin l'API version au plus récent supporté par le SDK installé (cf.
// node_modules/stripe/types/apiVersion.d.ts → '2026-01-28.clover').
// Évite "Received unknown parameter: automatic_payment_methods" quand la
// version par défaut du COMPTE Stripe est antérieure à l'ajout de ce champ
// pour les Checkout Sessions (cf. Stripe changelog 2022-11+).
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

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

// Lit le seuil livraison offerte depuis la table settings (default 60€).
async function getFreeShippingThreshold(): Promise<number> {
  try {
    const { data } = await supabaseServer
      .from("settings")
      .select("value")
      .eq("key", "free_shipping_threshold")
      .single();
    const n = Number(data?.value);
    return Number.isFinite(n) ? n : 60;
  } catch {
    return 60;
  }
}

export async function POST(req: Request) {
  try {
    const {
      items,
      promo_code,
      customer_email,
      customer_phone,
      delivery_type,
      carrier,
      relay,
      home_address,
    } = await req.json();

    // ⚠️ SÉCURITÉ : les champs `discount` et `free_shipping` envoyés par le
    // client sont VOLONTAIREMENT IGNORÉS. La remise et le statut "port offert"
    // sont recalculés côté serveur via validatePromoCode + computeShipping.
    // Un client malveillant ne peut donc PAS forger une remise inexistante
    // ni s'offrir le port en passant free_shipping=true dans le body.

    if (!items || items.length === 0) {
      return Response.json({ error: "Panier vide" }, { status: 400 });
    }

    // ── Validation transporteur + mode de livraison ──────────────────────────
    if (!carrier || !ALLOWED_CARRIERS.includes(carrier)) {
      return Response.json({ error: `Transporteur invalide (autorisés: ${ALLOWED_CARRIERS.join(", ")})` }, { status: 400 });
    }
    if (!delivery_type || !ALLOWED_DELIVERY_TYPES.includes(delivery_type)) {
      return Response.json({ error: `Mode de livraison invalide (autorisés: ${ALLOWED_DELIVERY_TYPES.join(", ")})` }, { status: 400 });
    }
    if (!isDeliveryCombinationAllowed(carrier, delivery_type)) {
      return Response.json({ error: `Combinaison ${carrier}/${delivery_type} non disponible` }, { status: 400 });
    }
    if ((delivery_type === "point_relais" || delivery_type === "locker") && (!relay || !relay.id)) {
      return Response.json({ error: "Point relais manquant" }, { status: 400 });
    }
    if (delivery_type === "home") {
      if (!home_address?.name?.trim() || !home_address?.line1?.trim() || !home_address?.postal_code?.trim() || !home_address?.city?.trim()) {
        return Response.json({ error: "Adresse de livraison incomplète" }, { status: 400 });
      }
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
      if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
        return Response.json({ error: `Quantité invalide pour ${product.name}` }, { status: 400 });
      }

      if ((product.stock ?? 0) < qty) {
        return Response.json({ error: `Stock insuffisant pour ${product.name}` }, { status: 400 });
      }

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

      const now = new Date();
      const isPromoActive = product.promo_price && product.promo_start && product.promo_end &&
        new Date(product.promo_start) <= now && new Date(product.promo_end) >= now;
      const finalPrice = isPromoActive ? product.promo_price : product.price_ttc;

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
        name:          displayName,
        slug:          product.slug,
        price:         finalPrice,
        quantity:      qty,
        category_slug: product.category_slug ?? "",
        taille:        taille ?? null,
      });
    }

    // ── Subtotal serveur (jamais celui du client) ────────────────────────────
    const subtotal = lineItems.reduce((s, l) => s + l.price_data.unit_amount * l.quantity, 0) / 100;

    // ── RE-VALIDATION du code promo côté serveur ─────────────────────────────
    // Si promo_code est fourni : on rejoue la validation. Si elle échoue
    // (expiré, max_uses atteint, etc.) → on continue SANS promo (silencieux,
    // ne casse pas le checkout). Le panier client aura déjà affiché l'erreur.
    let serverDiscount      = 0;
    let serverPromoCode     = "";
    let serverPromoForCS: { free_shipping: boolean; cumulable_avec_livraison: boolean } | null = null;

    if (promo_code && String(promo_code).trim()) {
      const v = await validatePromoCode(String(promo_code), subtotal);
      if (v.valid) {
        serverDiscount  = v.discount;
        serverPromoCode = v.code;
        serverPromoForCS = {
          free_shipping:            v.free_shipping,
          cumulable_avec_livraison: v.cumulable_avec_livraison,
        };
      }
      // Sinon : promo silencieusement ignorée. Pas d'erreur — l'UX serait
      // catastrophique de rejeter au checkout après un code accepté au panier.
    }

    // ── Calcul port via computeShipping (Option A : seuil sur subtotal BRUT) ─
    const freeShipThreshold = await getFreeShippingThreshold();
    const basePrice         = getDeliveryPrice(carrier, delivery_type);
    const shippingDecision  = computeShipping({
      subtotal,
      freeShippingThreshold: freeShipThreshold,
      basePrice,
      promo: serverPromoForCS,
    });
    const deliveryCost = shippingDecision.shipping;

    if (deliveryCost > 0) {
      lineItems.push({
        price_data: {
          currency:     "eur",
          product_data: { name: deliveryLabel(carrier, delivery_type) },
          unit_amount:  Math.round(deliveryCost * 100),
        },
        quantity: 1,
      });
    }

    const sessionParams: any = {
      automatic_payment_methods: { enabled: true },
      line_items:           lineItems,
      mode:                 "payment",
      billing_address_collection: "auto",
      customer_creation:          "always",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.NEXT_PUBLIC_BASE_URL}/panier`,
      locale:      "fr",
      ...(customer_email ? { customer_email } : {}),
      metadata: {
        items:             JSON.stringify(validatedItems),
        // ⚠️ Metadata = vérité serveur (utilisée par le webhook pour
        // persister la commande). Aucune confiance dans le client.
        promo_code:        serverPromoCode,
        discount:          String(serverDiscount),
        free_shipping:     String(shippingDecision.shippingFree),
        shipping_reason:   shippingDecision.reason,
        carrier,
        delivery_type,
        delivery_price:    String(deliveryCost),
        customer_phone:    String(customer_phone ?? "").slice(0, 30),
        relay_id:          relay?.id          ?? "",
        relay_name:        relay?.name        ?? "",
        relay_street:      relay?.street      ?? "",
        relay_city:        relay?.city        ?? "",
        relay_postal_code: relay?.postal_code ?? "",
        relay_type:        relay?.type        ?? "",
        home_address:      home_address ? JSON.stringify(home_address) : "",
      },
    };

    if (delivery_type === "home") {
      sessionParams.shipping_address_collection = {
        allowed_countries: ["FR", "BE", "CH", "LU", "MC"],
      };
    }

    if (serverDiscount > 0) {
      const idempotencyKey = `coupon-${serverPromoCode || "anon"}-${Math.round(serverDiscount * 100)}-${customer_email ?? "guest"}-${Date.now() >> 16}`;
      const coupon = await stripe.coupons.create({
        amount_off: Math.round(serverDiscount * 100),
        currency:   "eur",
        duration:   "once",
        name:       `Code ${serverPromoCode}`,
      }, { idempotencyKey });
      sessionParams.discounts = [{ coupon: coupon.id }];
    }

    // ✅ Vérification montant minimum Stripe (0.50€)
    const finalTotal = Math.max(0, subtotal - serverDiscount) + deliveryCost;
    if (finalTotal < 0.50) {
      return Response.json({ error: "Le montant total est trop faible pour être traité (minimum 0.50€)" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return Response.json({ url: session.url });

  } catch (error: any) {
    process.env.NODE_ENV !== "production" && console.error("Checkout error:", error);
    return Response.json({ error: error.message ?? "Erreur serveur" }, { status: 500 });
  }
}
