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

// ── Matrice prix livraison — source unique de vérité ────────────────────────
// Aligné avec le sélecteur côté panier. Si tu ajoutes/modifies un tarif ici,
// le panier le reflètera automatiquement (il lit ces mêmes valeurs via
// /api/settings/public + son propre miroir constants).
const DELIVERY_PRICES: Record<string, Record<string, number>> = {
  mondial_relay: {
    point_relais: 3.50,
    locker:       3.50,
    home:         5.20,
  },
  colissimo: {
    point_relais: 5.90,
    home:         7.70,
  },
};

const ALLOWED_CARRIER  = Object.keys(DELIVERY_PRICES);
const ALLOWED_DELIVERY = ["home", "point_relais", "locker"];

// Labels Stripe par combinaison carrier × type
function deliveryLabel(carrier: string, deliveryType: string): string {
  const map: Record<string, Record<string, string>> = {
    mondial_relay: {
      point_relais: "Mondial Relay Point Relais",
      locker:       "Mondial Relay Locker",
      home:         "Mondial Relay Domicile",
    },
    colissimo: {
      point_relais: "Colissimo Point Relais",
      home:         "Colissimo Domicile",
    },
  };
  return map[carrier]?.[deliveryType] ?? `${carrier} ${deliveryType}`;
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
    const { items, promo_code, discount, free_shipping, customer_email, customer_phone, delivery_type, carrier, relay, home_address } = await req.json();

    if (!items || items.length === 0) {
      return Response.json({ error: "Panier vide" }, { status: 400 });
    }

    // ── Validation transporteur + mode de livraison ──────────────────────────
    if (!carrier || !ALLOWED_CARRIER.includes(carrier)) {
      return Response.json({ error: `Transporteur invalide (autorisés: ${ALLOWED_CARRIER.join(", ")})` }, { status: 400 });
    }
    if (!delivery_type || !ALLOWED_DELIVERY.includes(delivery_type)) {
      return Response.json({ error: `Mode de livraison invalide (autorisés: ${ALLOWED_DELIVERY.join(", ")})` }, { status: 400 });
    }
    // Combinaison carrier × type doit exister dans la matrice
    if (DELIVERY_PRICES[carrier]?.[delivery_type] === undefined) {
      return Response.json({ error: `Combinaison ${carrier}/${delivery_type} non disponible` }, { status: 400 });
    }
    // Point relais / locker → relay.id obligatoire
    if ((delivery_type === "point_relais" || delivery_type === "locker") && (!relay || !relay.id)) {
      return Response.json({ error: "Point relais manquant" }, { status: 400 });
    }
    // Domicile → adresse complète
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

      // ✅ Validation qty — évite les valeurs négatives, nulles ou excessives
      if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
        return Response.json({ error: `Quantité invalide pour ${product.name}` }, { status: 400 });
      }

      // ── Vérification montant minimum Stripe (0.50€)
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

    // ── Livraison : prix depuis la matrice DELIVERY_PRICES ──────────────────
    // Le seuil "livraison offerte dès X€" est lu depuis la table settings.
    // free_shipping=true côté code promo court-circuite la livraison aussi.
    const subtotal           = lineItems.reduce((s, l) => s + l.price_data.unit_amount * l.quantity, 0) / 100;
    const freeShipThreshold  = await getFreeShippingThreshold();
    const hasFreeShipping    = free_shipping || subtotal >= freeShipThreshold;
    const baseDelivery       = DELIVERY_PRICES[carrier][delivery_type];
    const deliveryCost       = hasFreeShipping ? 0 : baseDelivery;

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

    // Pour point_relais : pas besoin de demander l'adresse à Stripe (le client
    // va retirer au point relais sélectionné). Pour home : on demande l'adresse
    // de livraison à Stripe en plus, mais celle qu'on a déjà côté UI sert de
    // référence.
    const sessionParams: any = {
      // Carte uniquement. Apple Pay / Google Pay s'affichent automatiquement
      // sur les navigateurs compatibles (Safari, Chrome Android) via "card".
      // Stripe Link désactivé (pas listé → ne s'affiche pas).
      payment_method_types: ["card"],
      payment_method_options: {
        card: {
          request_three_d_secure: "automatic",
        },
      },
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
        promo_code:        promo_code    ?? "",
        discount:          String(discount   ?? 0),
        free_shipping:     String(free_shipping ?? false),
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

    // Pour home : on demande à Stripe de collecter l'adresse de livraison
    // (sert de confirmation + adresse de facturation par défaut)
    if (delivery_type === "home") {
      sessionParams.shipping_address_collection = {
        allowed_countries: ["FR", "BE", "CH", "LU", "MC"],
      };
    }

    if (discount && discount > 0) {
      const idempotencyKey = `coupon-${promo_code ?? "anon"}-${Math.round(Number(discount) * 100)}-${customer_email ?? "guest"}-${Date.now() >> 16}`;
      const coupon = await stripe.coupons.create({
        amount_off: Math.round(Number(discount) * 100),
        currency:   "eur",
        duration:   "once",
        name:       `Code ${promo_code}`,
      }, { idempotencyKey });
      sessionParams.discounts = [{ coupon: coupon.id }];
    }

    // ✅ Vérification montant minimum Stripe (0.50€)
    const totalAfterDiscount = subtotal - discount;
    const finalTotal = Math.max(0, totalAfterDiscount) + deliveryCost;
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