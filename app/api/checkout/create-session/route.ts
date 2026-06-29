import Stripe from "stripe";
import crypto from "node:crypto";
import { supabaseServer } from "@/lib/server/supabase";
import {
  ALLOWED_CARRIERS,
  ALLOWED_DELIVERY_TYPES,
  isDeliveryCombinationAllowed,
  getDeliveryPrice,
  deliveryLabel,
} from "@/lib/delivery-config";
import { validatePromoCode } from "@/lib/promo-validate";
import { computeCartTotals } from "@/lib/cart-totals";

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
      packs,
      promo_code,
      customer_email,
      customer_phone,
      delivery_type,
      carrier,
      relay,
      home_address,
      locale,
    } = await req.json();

    const itemsArr: any[] = Array.isArray(items) ? items : [];
    const packsArr: any[] = Array.isArray(packs) ? packs : [];

    // Locale courante (passée par le client via useLocale()). On whiteliste
    // strictement : tout sauf 'en' retombe sur 'fr' (defaultLocale). Évite
    // qu'une valeur forgée crée une URL de redirection invalide.
    const safeLocale: "fr" | "en" = locale === "en" ? "en" : "fr";

    // ⚠️ SÉCURITÉ : les champs `discount` et `free_shipping` envoyés par le
    // client sont VOLONTAIREMENT IGNORÉS. La remise et le statut "port offert"
    // sont recalculés côté serveur via validatePromoCode + computeShipping.
    // Un client malveillant ne peut donc PAS forger une remise inexistante
    // ni s'offrir le port en passant free_shipping=true dans le body.

    if (itemsArr.length === 0 && packsArr.length === 0) {
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

    // Batch : 1 seule requête pour TOUS les produits du panier (élimine le N+1).
    const itemIds = [...new Set(itemsArr.map((i: any) => i.id).filter(Boolean))];
    const { data: productsData } = await supabaseServer
      .from("products").select("*").in("id", itemIds.length ? itemIds : ["none"]);
    const productMap: Record<string, any> = {};
    (productsData ?? []).forEach((p: any) => { productMap[p.id] = p; });

    for (const item of itemsArr) {
      const product = productMap[item.id];

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

    // ── PACKS : validation + résolution des tailles PAR PIÈCE (mono/multi) +
    //    line item au FORFAIT. Le breakdown résolu (pour le webhook : record +
    //    décrément) est stocké dans le draft. Stock vérifié × quantité. ─────────
    const draftPacks: any[] = [];
    let packsSubtotal = 0;
    if (packsArr.length > 0) {
      const packIds = [...new Set(packsArr.map((p: any) => p.pack_id).filter(Boolean))];
      const { data: packsData } = await supabaseServer
        .from("packs")
        .select(`id, slug, title, price, image_url, active, pack_items ( product:products ( id, name, slug, sizes, sizes_stock, stock ) )`)
        .in("id", packIds.length ? packIds : ["none"])
        .eq("active", true);
      const packMap: Record<string, any> = {};
      (packsData ?? []).forEach((p: any) => { packMap[p.id] = p; });

      for (const pl of packsArr) {
        const pack = packMap[pl.pack_id];
        if (!pack) return Response.json({ error: `Coffret introuvable : ${pl.pack_id}` }, { status: 400 });
        const qty = Number(pl.quantity) || 1;
        if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
          return Response.json({ error: `Quantité invalide pour ${pack.title}` }, { status: 400 });
        }
        const prods = (pack.pack_items ?? []).map((it: any) => it.product).filter(Boolean);
        if (prods.length === 0) return Response.json({ error: `Coffret vide : ${pack.title}` }, { status: 400 });

        const pieces: { product_id: string; name: string; size: string | null }[] = [];
        for (const p of prods) {
          const sizes: string[] = Array.isArray(p.sizes) ? p.sizes : [];
          let pieceSize: string | null;
          if (sizes.length > 1) {
            if (!pl.size) return Response.json({ error: "Taille requise", product: pack.title }, { status: 400 });
            if (!sizes.includes(pl.size)) return Response.json({ error: "Taille indisponible pour un article", product: p.name }, { status: 400 });
            pieceSize = pl.size;
          } else if (sizes.length === 1) {
            pieceSize = sizes[0];
          } else {
            pieceSize = null;
          }
          if (pieceSize) {
            if (((p.sizes_stock ?? {})[pieceSize] ?? 0) < qty) {
              return Response.json({ error: "Rupture de stock", product: p.name }, { status: 400 });
            }
          } else if ((p.stock ?? 0) < qty) {
            return Response.json({ error: "Rupture de stock", product: p.name }, { status: 400 });
          }
          pieces.push({ product_id: p.id, name: p.name, size: pieceSize });
        }

        const forfait = Number(pack.price) || 0;
        packsSubtotal += forfait * qty;

        lineItems.push({
          price_data: {
            currency:     "eur",
            product_data: {
              name: `${pack.title}${pl.size ? ` — ${pl.size}` : ""}`,
              ...(pack.image_url ? { images: [pack.image_url] } : {}),
            },
            unit_amount: Math.round(forfait * 100),
          },
          quantity: qty,
        });

        draftPacks.push({
          pack_id: pack.id, title: pack.title, slug: pack.slug,
          size: pl.size ?? null, quantity: qty, price: forfait, pieces,
        });
      }
    }

    // ── Sous-total serveur (produits + packs forfait — jamais le client) ──────
    const productsSubtotal = validatedItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const subtotal         = productsSubtotal + packsSubtotal;

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

    // ── Calcul UNIFIÉ produits+packs (seuil livraison sur le TOTAL APRÈS PROMO)
    //    via computeCartTotals — MÊME fonction que le panier (affiché = facturé).
    const freeShipThreshold = await getFreeShippingThreshold();
    const basePrice         = getDeliveryPrice(carrier, delivery_type);
    const totals = computeCartTotals({
      productsSubtotal,
      packsSubtotal,
      discount: serverDiscount,
      basePrice,
      freeShippingThreshold: freeShipThreshold,
      promo: serverPromoForCS,
    });
    const deliveryCost = totals.shipping;

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

    // ── DRAFT (pending_orders) : SÉLECTION RÉSOLUE (produits + pièces de packs
    //    avec leurs tailles) + livraison + promo. Sert au webhook à RETROUVER la
    //    commande et décrémenter. Le BILLING reste les line_items Stripe (calculés
    //    depuis la base ci-dessus), jamais les montants du draft.
    const { data: draft, error: draftErr } = await supabaseServer
      .from("pending_orders")
      .insert([{
        products: validatedItems.map(i => ({ id: i.id, name: i.name, slug: i.slug, price: i.price, quantity: i.quantity, taille: i.taille, category_slug: i.category_slug })),
        packs:    draftPacks,
        promo_code: serverPromoCode || null,
        delivery: {
          carrier, delivery_type,
          delivery_price: deliveryCost,
          customer_phone: String(customer_phone ?? "").slice(0, 30),
          relay: relay ? { id: relay.id, name: relay.name, street: relay.street, city: relay.city, postal_code: relay.postal_code, type: relay.type } : null,
          home_address: home_address ?? null,
        },
        guest_email: customer_email ?? null,
        locale:      safeLocale,
        status:      "pending",
      }])
      .select("id").single();
    if (draftErr || !draft) {
      process.env.NODE_ENV !== "production" && console.error("pending_orders insert error:", draftErr?.message);
      return Response.json({ error: "Erreur lors de la préparation de la commande." }, { status: 500 });
    }
    const pendingOrderId = draft.id as string;

    const sessionParams: any = {
      // 'card' → Apple Pay / Google Pay sont automatiquement présentés sur
      // Safari iOS / Chrome Android par Stripe. 'paypal' → bouton PayPal natif
      // dans le Checkout Stripe (aucune clé PayPal requise : le compte PayPal
      // est lié côté Stripe Dashboard → Paramètres → Moyens de paiement).
      // ⚠️ 'paypal' doit être ACTIVÉ dans le Dashboard Stripe, sinon l'API
      // rejette la création de session ("payment method type paypal is invalid").
      payment_method_types: ["card", "paypal"],
      line_items:           lineItems,
      mode:                 "payment",
      billing_address_collection: "auto",
      customer_creation:          "always",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/${safeLocale}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.NEXT_PUBLIC_BASE_URL}/${safeLocale}/panier`,
      locale:      safeLocale,
      ...(customer_email ? { customer_email } : {}),
      // ⚠️ Metadata = UNIQUEMENT l'id du draft (évite la limite Stripe 500 car.
      // par valeur sur un panier mixte). Le webhook lit pending_orders par cet id.
      metadata: {
        pending_order_id: pendingOrderId,
      },
    };

    if (delivery_type === "home") {
      sessionParams.shipping_address_collection = {
        allowed_countries: ["FR", "BE", "CH", "LU", "MC"],
      };
    }

    if (serverDiscount > 0) {
      // Clé STABLE dérivée du panier+promo+email (hash), SANS fenêtre temporelle.
      // Avant: `Date.now() >> 16` changeait toutes les ~65s → coupons orphelins +
      // collisions. Ici, un retry/double-clic du MÊME panier réutilise le même
      // coupon (vraie idempotency Stripe) ; deux paniers différents → clés distinctes.
      const cartSig = [
        ...validatedItems.map(i => `${i.id}:${i.quantity}`),
        ...draftPacks.map(p => `pack:${p.pack_id}:${p.size ?? ""}:${p.quantity}`),
      ].join(",");
      const cartHash = crypto.createHash("sha1").update(cartSig).digest("hex").slice(0, 12);
      const idempotencyKey = `coupon-${serverPromoCode || "anon"}-${Math.round(serverDiscount * 100)}-${customer_email ?? "guest"}-${cartHash}`;
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
    // Lien retour draft ↔ session (le webhook retrouvera aussi par pending_order_id).
    await supabaseServer.from("pending_orders").update({ stripe_session_id: session.id }).eq("id", pendingOrderId);
    return Response.json({ url: session.url });

  } catch (error: any) {
    process.env.NODE_ENV !== "production" && console.error("Checkout error:", error);
    return Response.json({ error: error.message ?? "Erreur serveur" }, { status: 500 });
  }
}
