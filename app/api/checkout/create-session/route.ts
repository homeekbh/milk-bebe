import Stripe from "stripe";
import crypto from "node:crypto";
import { supabaseServer } from "@/lib/server/supabase";
import {
  ALLOWED_CARRIERS,
  ALLOWED_DELIVERY_TYPES,
  isDeliveryCombinationAllowed,
  getDeliveryPrice,
  deliveryLabel,
  getZoneForCountry,
  getInternationalShippingPrice,
  isFreeShippingEligibleZone,
  isDomTomPostalCode,
  routingCountry,
} from "@/lib/delivery-config";
import { resolveItemWeightG, PACKAGING_WEIGHT_G } from "@/lib/weight";
import { validatePromoCode, validatePromoCombo, PROMO_CAP_RATE } from "@/lib/promo-validate";
import { computeCartTotals, computeInternationalCartTotals } from "@/lib/cart-totals";
import { computeParrainage } from "@/lib/parrainage";
import { getParrainageSettings, validateParrainCode, listUsableRewards, reserveRewards, releaseRewards, getUserFromRequest } from "@/lib/parrainage-server";
import { computeScopedShadow, maskEmail } from "@/lib/promo-scope-adapter";
import { getClientIp } from "@/lib/server/client-ip";

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

// Poids d'expédition (bug #5) : constantes PACKAGING_WEIGHT_G / DEFAULT_ITEM_WEIGHT_G + resolveItemWeightG
// déplacés dans lib/weight.ts — source UNIQUE partagée avec le webhook coffret (cf. import ci-dessus).

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
  // R2 : récompenses réservées pour cette session — libérées si échec/rejet avant paiement.
  let reservedRewardIdsInFlight: string[] = [];
  try {
    const {
      items,
      packs,
      promo_code,
      promo_codes,
      parrain_code,
      reward_ids,
      customer_email,
      customer_phone,
      delivery_type,
      carrier,
      relay,
      home_address,
      shipping_prefill,
      country,
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

    // ── ZONE DE LIVRAISON (serveur — JAMAIS confiance au client) ──────────────
    // Pays absent du body → "FR" (comportement prod actuel INCHANGÉ). Pays non
    // desservi → rejet dur : aucune session Stripe créée, même si le body est forgé.
    // isFreeShippingEligibleZone est true UNIQUEMENT pour "FR" → garde unique
    // pour tout le branchement domestique vs international.
    // routingCountry : Monaco (MC) → "FR" → tout le pipeline serveur (draft, metadata, webhook,
    // create-label) traite Monaco comme la métropole → Colissimo/Mondial Relay, jamais FedEx.
    const shippingCountry = routingCountry(country) || "FR";
    const shippingZone    = getZoneForCountry(shippingCountry);
    if (shippingZone === null) {
      return Response.json({ error: "Pays non desservi" }, { status: 400 });
    }
    const isFrance = isFreeShippingEligibleZone(shippingZone);

    // ── Validation transporteur + mode de livraison — FRANCE UNIQUEMENT ───────
    // À l'international, carrier / delivery_type / relay sont IGNORÉS (port fixe
    // de zone, pas de point relais hors France dans ce lot).
    if (isFrance) {
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
      // R4 (main) — refuser un point relais saisi à la main (id "manual:…") : il ne correspond à AUCUN
      // point Sendcloud → l'étiquette d'expédition ne peut pas être générée (commande payée mais non
      // expédiable). La saisie manuelle a été retirée de l'UI ; ceci bloque en plus toute requête forgée.
      if ((delivery_type === "point_relais" || delivery_type === "locker") && /^manual:/i.test(String(relay?.id ?? ""))) {
        return Response.json({ error: "Point relais invalide. Merci de sélectionner un point relais dans la liste proposée." }, { status: 400 });
      }
      if (delivery_type === "home") {
        if (!home_address?.name?.trim() || !home_address?.line1?.trim() || !home_address?.postal_code?.trim() || !home_address?.city?.trim()) {
          return Response.json({ error: "Adresse de livraison incomplète" }, { status: 400 });
        }
      }
      // Garde-fou DOM-TOM (blocage RÉVERSIBLE, cf. G4) : la matrice DELIVERY_PRICES (Colissimo/Mondial
      // Relay MÉTROPOLE, 3,50–7,70 €) ne couvre PAS l'outre-mer → port sous-facturé + colis non livrable.
      // ⚠️ On utilise isDomTomPostalCode (préfixes 971-988) — PAS isDomTom (97|98)xxx qui bloquait à tort
      //    Monaco 98000 (livré au tarif métropole). CP pris du domicile OU du relais. FRANCE uniquement
      //    (à l'international home_address/relay sont null → destPostalCode "" → aucun blocage).
      const destPostalCode = delivery_type === "home"
        ? String(home_address?.postal_code ?? "")
        : String(relay?.postal_code ?? "");
      if (isDomTomPostalCode(destPostalCode)) {
        return Response.json({
          error: "Nous ne livrons pas encore les DOM-TOM. Écrivez-nous à contact@milkbebe.fr pour un devis d'expédition.",
        }, { status: 400 });
      }
    }

    const lineItems      = [];
    const validatedItems = [];
    let   shippingWeightG = 0; // Σ poids nets (produits + pièces de packs) ; emballage ajouté à la fin

    // Batch : 1 seule requête pour TOUS les produits du panier (élimine le N+1).
    const itemIds = [...new Set(itemsArr.map((i: any) => i.id).filter(Boolean))];
    // itemIds VIDE (ex. panier 100% packs) → NE PAS interroger la base. L'ancien repli
    // `.in("id", ["none"])` passait la chaîne "none" à un cast uuid (products.id est de
    // type uuid) → erreur Postgres interprétée comme panne DB → 503, et le bloc packs
    // n'était jamais atteint. La requête n'est exécutée que s'il y a au moins un id.
    let productsData: any[] = [];
    if (itemIds.length > 0) {
      const { data, error: productsErr } = await supabaseServer
        .from("products").select("*").in("id", itemIds);
      // Erreur DB transitoire → NE PAS la masquer en « produit introuvable » (400, faux négatif qui
      // fait croire à un panier invalide) : renvoyer 503 pour inviter à réessayer. (Aucune récompense
      // n'est encore réservée à ce stade — la réservation R2 vient plus bas.)
      if (productsErr) {
        console.error("[create-session] products load failed (503):", productsErr.message);
        return Response.json({ error: "Service momentanément indisponible. Réessayez dans un instant." }, { status: 503 });
      }
      productsData = data ?? [];
    }
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

      // R3 — Résolution ROBUSTE de la taille (empêche le contournement du contrôle par taille
      // quand le name se termine par la couleur, ex. "Body — 0-3 mois — Terracotta"). Priorité :
      // item.taille (sélectionné au panier, ∈ product.sizes imposé par l'UI) ; sinon un SEGMENT du
      // name correspondant à une taille RÉELLE du produit ; sinon la taille unique. Rejet si le
      // produit a des tailles mais qu'aucune n'est résolue (anti-abus par requête forgée).
      const productSizes: string[] = Array.isArray(product.sizes) ? product.sizes.map(String) : [];
      let taille: string | null = null;
      if (productSizes.length > 0) {
        const explicit = item.taille != null ? String(item.taille).trim() : "";
        if (explicit && productSizes.includes(explicit)) {
          taille = explicit;
        } else {
          const seg = String(item.name ?? "").split(" — ").map(s => s.trim()).find(s => productSizes.includes(s));
          taille = seg ?? (productSizes.length === 1 ? productSizes[0] : null);
        }
        if (!taille) {
          return Response.json({ error: `Taille requise pour ${product.name}. Veuillez la sélectionner.` }, { status: 400 });
        }
      }

      // R-MOTIF — résolution du motif choisi, validée ANTI-FORGE contre product.colors (jamais cru du
      // body). N=1 auto-résolu serveur. Absent / invalide / legacy sans id → null (fallback stock global).
      const productColors: any[] = Array.isArray(product.colors) ? product.colors : [];
      const explicitMotif = item.motif_id != null ? String(item.motif_id).trim() : "";
      let motifId: string | null = null;
      if (explicitMotif && productColors.some((c: any) => String(c?.id ?? "") === explicitMotif)) {
        motifId = explicitMotif;
      } else if (productColors.length === 1 && productColors[0]?.id) {
        motifId = String(productColors[0].id);
      }

      const sizesStock: Record<string, number> = product.sizes_stock ?? {};
      const trackedSize = taille && Object.prototype.hasOwnProperty.call(sizesStock, taille) ? taille : null;

      // ── STOCK (PHASE 3) — VALIDATION SEULE, AUCUN décrément (le décrément reste products.stock via
      //    decrement_stock_atomic, phase 4). Lecture DB (product.colors), jamais le body. Reflète la
      //    VÉRITÉ FUTURE décrémentée en phase 4 → « ce qu'on autorise » = « ce qu'on décrémentera ».
      if (motifId) {
        // Produit à motif : valide colors[motif].sizes_stock[taille] (2D) ou colors[motif].stock (1D /
        // taille non pistée dans ce motif). Remplace le contrôle du stock GLOBAL pour cet item.
        const motif = productColors.find((c: any) => String(c?.id ?? "") === motifId);
        const motifSizes: Record<string, any> = (motif?.sizes_stock && typeof motif.sizes_stock === "object") ? motif.sizes_stock : {};
        const dispo = (taille && Object.prototype.hasOwnProperty.call(motifSizes, taille))
          ? Number(motifSizes[taille] ?? 0)
          : Number(motif?.stock ?? 0);
        if (dispo < qty) {
          return Response.json({
            error: `Stock insuffisant pour ${product.name}${taille ? ` — taille ${taille}` : ""} (motif sélectionné).`,
          }, { status: 400 });
        }
      } else {
        // Produit SANS motif (Bandeau/Bonnet) OU produit à motifs mais motif_id absent (ancien panier,
        // legacy) → on CONSERVE la validation actuelle sur products.stock / sizes_stock (aucune régression).
        if ((product.stock ?? 0) < qty) {
          return Response.json({ error: `Stock insuffisant pour ${product.name}` }, { status: 400 });
        }
        if (trackedSize && (sizesStock[trackedSize] ?? 0) < qty) {
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

      shippingWeightG += resolveItemWeightG(product) * qty;

      validatedItems.push({
        id:            product.id,
        name:          displayName,
        slug:          product.slug,
        price:         finalPrice,
        quantity:      qty,
        category_slug: product.category_slug ?? "",
        taille:        trackedSize ?? null,               // décrément products.stock ACTUEL (inchangé, phase 4 basculera)
        motif_id:      motifId,                            // motif validé (stock motif contrôlé ci-dessus, phase 3)
        motif_size:    motifId ? (taille ?? null) : null,  // taille produit = clé du décrément MOTIF (phase 4)
      });
    }

    // ── PACKS : validation + résolution des tailles PAR PIÈCE (mono/multi) +
    //    line item au FORFAIT. Le breakdown résolu (pour le webhook : record +
    //    décrément) est stocké dans le draft. Stock vérifié × quantité. ─────────
    const draftPacks: any[] = [];
    let packsSubtotal = 0;
    if (packsArr.length > 0) {
      const packIds = [...new Set(packsArr.map((p: any) => p.pack_id).filter(Boolean))];
      // Même correctif que pour les produits : packIds VIDE → ne pas requêter (le repli
      // `.in("id", ["none"])` castait "none" en uuid → 503). Si packIds est vide, la boucle
      // plus bas rejette proprement chaque pack en « Coffret introuvable » (400).
      let packsData: any[] = [];
      if (packIds.length > 0) {
        const { data, error: packsErr } = await supabaseServer
          .from("packs")
          .select(`id, slug, title, price, image_url, active, pack_items ( product:products ( id, name, slug, sizes, sizes_stock, stock, weight_g, colors ) )`)
          .in("id", packIds)
          .eq("active", true);
        // Erreur DB transitoire → 503 réessayable, pas un faux « pack indisponible » (400 trompeur).
        if (packsErr) {
          console.error("[create-session] packs load failed (503):", packsErr.message);
          return Response.json({ error: "Service momentanément indisponible. Réessayez dans un instant." }, { status: 503 });
        }
        packsData = data ?? [];
      }
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

        const pieces: { product_id: string; name: string; size: string | null; motif_id: string | null }[] = [];
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
          // Motif par pièce : N=1 auto-résolu ; multi-motif → null (sélection par pièce déférée).
          const pcColors: any[] = Array.isArray(p.colors) ? p.colors : [];
          const pieceMotifId = pcColors.length === 1 && pcColors[0]?.id ? String(pcColors[0].id) : null;
          // ── STOCK (PHASE 3) — VALIDATION SEULE, aucun décrément (phase 4). Lecture DB (p.colors). ──
          if (pieceMotifId) {
            // Vérité future : colors[motif].sizes_stock[taille] (2D) ou colors[motif].stock (1D).
            const pcMotif = pcColors.find((c: any) => String(c?.id ?? "") === pieceMotifId);
            const pcMotifSizes: Record<string, any> = (pcMotif?.sizes_stock && typeof pcMotif.sizes_stock === "object") ? pcMotif.sizes_stock : {};
            const dispo = (pieceSize && Object.prototype.hasOwnProperty.call(pcMotifSizes, pieceSize))
              ? Number(pcMotifSizes[pieceSize] ?? 0)
              : Number(pcMotif?.stock ?? 0);
            if (dispo < qty) return Response.json({ error: "Rupture de stock", product: p.name }, { status: 400 });
          } else {
            // Pièce sans motif OU motif non résolu → validation actuelle sur products.stock / sizes_stock.
            if (pieceSize) {
              if (((p.sizes_stock ?? {})[pieceSize] ?? 0) < qty) {
                return Response.json({ error: "Rupture de stock", product: p.name }, { status: 400 });
              }
            } else if ((p.stock ?? 0) < qty) {
              return Response.json({ error: "Rupture de stock", product: p.name }, { status: 400 });
            }
          }
          pieces.push({ product_id: p.id, name: p.name, size: pieceSize, motif_id: pieceMotifId });
        }

        // Poids du pack = Σ poids nets de ses pièces, × quantité de packs.
        const onePackWeightG = prods.reduce((sum: number, p: any) => sum + resolveItemWeightG(p), 0);
        shippingWeightG += onePackWeightG * qty;

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

    // ── RE-VALIDATION des codes promo côté serveur (1 ou PLUSIEURS — cumul étape 21)
    //    Dégradation gracieuse : un code invalide / incompatible / hors plafond est
    //    RETIRÉ et on réessaie (le panier a déjà refusé le 2e le cas échéant) → jamais
    //    de rejet au checkout après un code accepté au panier.
    let serverDiscount   = 0;
    let serverPromoCodes: string[] = [];
    let serverPromoForCS: { free_shipping: boolean; cumulable_avec_livraison: boolean } | null = null;
    {
      const rawCodes: string[] = Array.isArray(promo_codes)
        ? promo_codes.map((c: any) => String(c ?? "").toUpperCase().trim())
        : (promo_code ? [String(promo_code).toUpperCase().trim()] : []);
      let codes = [...new Set(rawCodes.filter(Boolean))];
      while (codes.length > 0) {
        const combo = await validatePromoCombo(codes, subtotal);
        if (combo.valid) {
          serverDiscount   = combo.totalDiscount;
          serverPromoCodes = combo.entries.map(e => e.code);
          serverPromoForCS = { free_shipping: combo.free_shipping, cumulable_avec_livraison: combo.cumulable_avec_livraison };
          break;
        }
        const bad  = combo.rejectedCode ?? codes[codes.length - 1];
        const next = codes.filter(c => c !== bad);
        if (next.length === codes.length) break; // rien retiré → stop (sécurité)
        codes = next;
      }
    }
    // Alias 1er code (compat aval : nom de coupon, draft.promo_code).
    const serverPromoCode = serverPromoCodes[0] ?? "";

    // ── SHADOW (Lot 7c-1) : moteur promo SCOPÉ calculé EN PARALLÈLE, JAMAIS facturé tant que
    //    PROMO_ENGINE !== 'scoped'. NON bloquant (computeScopedShadow ne throw jamais → null si KO).
    //    legacyServerDiscount = la valeur LEGACY PURE, capturée AVANT tout override (pour le log).
    //    Le branchement 'scoped' existe pour que le flip 7c-2 soit instantané ; INERTE en 7c-1.
    const legacyServerDiscount = serverDiscount;
    const rawCodesInOrder: string[] = (() => {
      const raw = Array.isArray(promo_codes)
        ? promo_codes.map((c: any) => String(c ?? "").toUpperCase().trim())
        : (promo_code ? [String(promo_code).toUpperCase().trim()] : []);
      return [...new Set(raw.filter(Boolean))]; // dédup, ordre de 1re occurrence préservé
    })();
    const scopedResult = await computeScopedShadow({
      codes:           rawCodesInOrder,
      validatedItems,                    // prix + catégorie = DB (validatedItems), jamais le body
      draftPacks,
      subtotal,
      isInternational: !isFrance,
    });
    const promoEngine = process.env.PROMO_ENGINE === "scoped" ? "scoped" : "legacy"; // 7c-1 : toujours legacy
    let scopedEngineNote: string | null = null;
    if (promoEngine === "scoped") {
      // 7c-2 uniquement (flag activé). En 7c-1 cette branche n'est JAMAIS prise → facturation legacy.
      if (scopedResult) serverDiscount = scopedResult.totalDiscount;
      else scopedEngineNote = "scoped_result_null_fallback_legacy";
    }

    // ── PORT : France = matrice transporteur + seuil 60€ (computeCartTotals,
    //    MÊME fonction que le panier, INCHANGÉ) ; international = port FIXE de zone,
    //    JAMAIS gratuit. freeShipThreshold est calculé dans les DEUX cas car
    //    computeParrainage (plus bas) s'en sert aussi.
    const freeShipThreshold = await getFreeShippingThreshold();
    let deliveryCost: number;
    let shippingLineLabel: string;
    if (isFrance) {
      const basePrice = getDeliveryPrice(carrier, delivery_type);
      const totals = computeCartTotals({
        productsSubtotal,
        packsSubtotal,
        discount: serverDiscount,
        basePrice,
        freeShippingThreshold: freeShipThreshold,
        promo: serverPromoForCS,
      });
      deliveryCost      = totals.shipping;
      shippingLineLabel = deliveryLabel(carrier, delivery_type);
    } else {
      // International : port de zone (11,90 / 14,90 / 18,90), toujours facturé.
      const intlTotals = computeInternationalCartTotals({
        productsSubtotal,
        packsSubtotal,
        discount:  serverDiscount,
        zonePrice: getInternationalShippingPrice(shippingCountry) ?? 0,
      });
      deliveryCost      = intlTotals.shipping;
      shippingLineLabel = `Livraison internationale (Zone ${shippingZone})`;
    }

    if (deliveryCost > 0) {
      lineItems.push({
        price_data: {
          currency:     "eur",
          product_data: { name: shippingLineLabel },
          unit_amount:  Math.round(deliveryCost * 100),
        },
        quantity: 1,
      });
    }

    // ── RE-VALIDATION PARRAINAGE (serveur — jamais le calcul client) ──────────
    // Méca 1 (code parrain, invité OK) + méca 2 (récompenses, compte requis).
    // On rejoue computeParrainage avec nos propres montants → montants figés ici,
    // le webhook n'appliquera que ce qui est écrit dans le payload du draft.
    const parrainageSettings = await getParrainageSettings();
    const requester = await getUserFromRequest(req);

    let hasValidParrainCode = false;
    let validParrainId: string | null = null;
    let validParrainCode: string | null = null;
    if (parrain_code && String(parrain_code).trim()) {
      const chk = await validateParrainCode(String(parrain_code), {
        requesterUserId: requester?.id ?? null,
        requesterEmail:  requester?.email ?? customer_email ?? null,
        settings:        parrainageSettings,
      });
      if (chk.valid) {
        hasValidParrainCode = true;
        validParrainId   = chk.parrainId;
        validParrainCode = String(parrain_code).trim().toUpperCase();
      }
    }

    // Récompenses (méca 2) : uniquement celles RÉELLEMENT utilisables du compte
    // connecté, filtrées sur la sélection cliente (jamais confiance au client).
    const usableRewards = requester ? await listUsableRewards(requester.id) : [];
    const wantedRewardIds = new Set((Array.isArray(reward_ids) ? reward_ids : []).map(String));
    const selectedUsable = usableRewards.filter(r => wantedRewardIds.has(r.id));

    // R2 — RÉSERVER atomiquement les récompenses sélectionnées (anti double-dépense concurrente).
    // Seules les récompenses réellement réservées (gagnantes du CAS disponible→reservee) comptent.
    const reservedRewards = requester ? await reserveRewards(requester.id, selectedUsable) : [];
    reservedRewardIdsInFlight = reservedRewards.map(r => r.id);

    const cartCategorySlugs: string[] = [
      ...validatedItems.map((i: any) => i.category_slug).filter(Boolean),
      ...draftPacks.flatMap((p: any) => (Array.isArray(p.items) ? p.items : []).map((it: any) => it?.category_slug).filter(Boolean)),
    ];

    const parrainageResult = computeParrainage({
      settings:              parrainageSettings,
      subtotal,
      promoDiscount:         serverDiscount,
      freeShippingThreshold: freeShipThreshold,
      hasValidParrainCode,
      rewardsAvailableCount: usableRewards.length,
      rewardsSelectedCount:  reservedRewards.length,
      cartCategorySlugs,
    });

    const parrainDiscount   = parrainageResult.parrainDiscount;
    const rewardDiscount    = parrainageResult.rewardDiscount;
    const consumedRewardIds = reservedRewards.slice(0, parrainageResult.rewardsUsable).map(r => r.id);
    // Libérer les récompenses réservées NON retenues (au-delà du plafond de seuils) → ne pas les bloquer.
    const notConsumedRewardIds = reservedRewards.slice(parrainageResult.rewardsUsable).map(r => r.id);
    if (notConsumedRewardIds.length) await releaseRewards(notConsumedRewardIds);
    reservedRewardIdsInFlight = consumedRewardIds;
    const parrainApplied    = parrainageResult.parrainApplicable && !!validParrainId;

    // ── ANTI-ABUS : crédit récompense parrain (méca 1) réservé à un FILLEUL
    //    AUTHENTIFIÉ. Le webhook ne crée la récompense que si parrain_id est posé ;
    //    on ne le pose donc QUE si `requester` (compte connecté via Bearer) existe.
    //    Pour un filleul authentifié, validateParrainCode a DÉJÀ garanti id ≠ parrain
    //    ET email ≠ parrain (même-compte / même-email bloqués). Un INVITÉ (email seul,
    //    potentiellement jetable) bénéficie de la REMISE filleul mais ne peut PAS
    //    déclencher le crédit récompense parrain (fermeture du self-referral invité).
    const parrainRewardEligible = parrainApplied && !!requester?.id;

    // ── Garde-fou 60% « tous confondus » pour le CUMUL (≥ 2 codes promo) : si le
    //    grand total (promo + parrain + récompenses) dépasse 60% du sous-total, on
    //    RETIRE le dernier code promo et on recalcule la combo. Parrain/récompenses
    //    gardés tels quels (retirer un code AUGMENTE le total après promo → ils ne
    //    feraient qu'augmenter → conservateur/sûr).
    if (serverPromoCodes.length >= 2) {
      const cap = Math.round(subtotal * PROMO_CAP_RATE * 100) / 100;
      let guardCodes = [...serverPromoCodes];
      while (guardCodes.length >= 2 && (serverDiscount + parrainDiscount + rewardDiscount) > cap) {
        guardCodes = guardCodes.slice(0, -1);
        const combo = await validatePromoCombo(guardCodes, subtotal);
        if (!combo.valid) break;
        serverDiscount   = combo.totalDiscount;
        serverPromoCodes = combo.entries.map(e => e.code);
        serverPromoForCS = { free_shipping: combo.free_shipping, cumulable_avec_livraison: combo.cumulable_avec_livraison };
      }
    }

    // Payload écrit dans le draft → seule source que le webhook consommera.
    const parrainagePayload = {
      parrain_code:     parrainApplied ? validParrainCode : null,
      // parrain_id posé UNIQUEMENT si le filleul est authentifié → seul cas où le
      // webhook crédite la récompense parrain. (La remise filleul, elle, reste appliquée
      // via parrain_discount même pour un invité.)
      parrain_id:       parrainRewardEligible ? validParrainId : null,
      parrain_discount: parrainApplied ? parrainDiscount  : 0,
      reward_ids:       consumedRewardIds,
      reward_discount:  rewardDiscount,
    };

    // ── SHADOW LOG (Lot 7c-1) : compare scoped vs legacy sur trafic réel anonymisé. BEST-EFFORT :
    //    un échec d'insert (table absente comprise) ne fait JAMAIS échouer le checkout. legacy_discount
    //    = valeur LEGACY PURE (capturée avant tout override), même si PROMO_ENGINE='scoped'. On recompute
    //    ici la MÊME signature de panier que le coupon (~plus bas) pour laisser ce bloc-là INCHANGÉ.
    try {
      const shadowCartSig = [
        ...validatedItems.map(i => `${i.id}:${i.quantity}`),
        ...draftPacks.map(p => `pack:${p.pack_id}:${p.size ?? ""}:${p.quantity}`),
        `promo:${serverPromoCodes.join("+")}`,
        `parrain:${parrainApplied ? validParrainCode : ""}`,
        `rewards:${consumedRewardIds.join("+")}`,
      ].join(",");
      const shadowCartHash = crypto.createHash("sha1").update(shadowCartSig).digest("hex").slice(0, 12);
      const scopedDiscount = scopedResult?.totalDiscount ?? 0;
      const discountDelta  = Math.round((scopedDiscount - legacyServerDiscount) * 100) / 100;
      await supabaseServer.from("promo_shadow_log").insert([{
        cart_hash:            shadowCartHash,
        email_masked:         maskEmail(customer_email),
        subtotal,
        promo_codes:          rawCodesInOrder,
        parrain_code:         parrainApplied ? validParrainCode : null,
        reward_count:         consumedRewardIds.length,
        legacy_discount:      legacyServerDiscount,
        scoped_discount:      scopedDiscount,
        scoped_ratio:         scopedResult?.discountRatio ?? 0,
        scoped_cap_exceeded:  scopedResult?.capExceeded ?? false,
        scoped_free_shipping: scopedResult?.freeShipping ?? false,
        discount_delta:       discountDelta,
        is_match:             Math.abs(discountDelta) < 0.01,
        scoped_rejected:      scopedResult?.rejectedCodes ?? [],
        notes:                scopedEngineNote ?? (scopedResult === null ? "scoped_result_null" : null),
      }]);
    } catch (e: any) {
      process.env.NODE_ENV !== "production" && console.error("[create-session] promo_shadow_log (non bloquant):", e?.message);
    }

    // Poids total d'expédition (bug #5) : Σ produits + pièces de packs, PUIS emballage
    // ajouté UNE seule fois (1 commande = 1 colis). Persisté via le draft → webhook →
    // orders.total_weight_g, puis lu par create-label pour la vraie tranche transporteur.
    const totalWeightG = Math.round(shippingWeightG) + PACKAGING_WEIGHT_G;

    // ── Contexte marketing (Lot M3) — capturé CÔTÉ SERVEUR depuis headers/cookies,
    //    JAMAIS depuis le body (contrat de requête inchangé). Persisté tel quel dans
    //    pending_orders.tracking pour un usage CAPI ULTÉRIEUR (aucun envoi ici).
    //    Toute la construction est enveloppée : le moindre échec → tracking = null,
    //    l'achat n'échoue JAMAIS à cause de ce lot. Aucune valeur n'est logguée en clair.
    let tracking: any = null;
    try {
      const cookieHeader = req.headers.get("cookie") ?? "";
      const cookieVal = (name: string): string | null => {
        for (const c of cookieHeader.split(";")) {
          const i = c.indexOf("=");
          if (i >= 0 && c.slice(0, i).trim() === name) return c.slice(i + 1).trim() || null;
        }
        return null;
      };
      const consentRaw = cookieVal("milk_consent");
      const ip = getClientIp(req);
      tracking = {
        consent:     consentRaw === "accepted" || consentRaw === "refused" ? consentRaw : null,
        fbp:         cookieVal("_fbp"),
        fbc:         cookieVal("_fbc"),
        ip:          ip && ip !== "unknown" ? ip : null,
        ua:          req.headers.get("user-agent") || null,
        referer:     req.headers.get("referer") || null,
        captured_at: new Date().toISOString(),
      };
    } catch { tracking = null; }

    // ── DRAFT (pending_orders) : SÉLECTION RÉSOLUE (produits + pièces de packs
    //    avec leurs tailles) + livraison + promo. Sert au webhook à RETROUVER la
    //    commande et décrémenter. Le BILLING reste les line_items Stripe (calculés
    //    depuis la base ci-dessus), jamais les montants du draft.
    const { data: draft, error: draftErr } = await supabaseServer
      .from("pending_orders")
      .insert([{
        products: validatedItems.map(i => ({ id: i.id, name: i.name, slug: i.slug, price: i.price, quantity: i.quantity, taille: i.taille, motif_id: i.motif_id, motif_size: i.motif_size, category_slug: i.category_slug })),
        packs:    draftPacks,
        promo_code:  serverPromoCode || null, // 1er code (compat)
        promo_codes: serverPromoCodes,        // tous les codes appliqués (cumul)
        delivery: {
          carrier:        isFrance ? carrier : null,
          delivery_type:  isFrance ? delivery_type : null,
          country:        shippingCountry,
          shipping_zone:  shippingZone,
          delivery_price: deliveryCost,
          customer_phone: String(customer_phone ?? "").slice(0, 30),
          total_weight_g: totalWeightG,
          relay: isFrance && relay ? { id: relay.id, name: relay.name, street: relay.street, city: relay.city, postal_code: relay.postal_code, type: relay.type } : null,
          home_address: isFrance ? (home_address ?? null) : null,
        },
        guest_email: customer_email ?? null,
        locale:      safeLocale,
        parrainage:  parrainagePayload,
        tracking,
        status:      "pending",
      }])
      .select("id").single();
    if (draftErr || !draft) {
      process.env.NODE_ENV !== "production" && console.error("pending_orders insert error:", draftErr?.message);
      await releaseRewards(reservedRewardIdsInFlight); // R2 : libérer les récompenses réservées (pas de commande)
      return Response.json({ error: "Erreur lors de la préparation de la commande." }, { status: 500 });
    }
    const pendingOrderId = draft.id as string;

    const sessionParams: any = {
      // PAS de payment_method_types explicite → Stripe Checkout affiche AUTOMATIQUEMENT
      // tous les moyens éligibles activés dans le Dashboard (carte → Apple Pay / Google Pay
      // sur Safari iOS / Chrome Android, PayPal, Klarna, Link…), selon montant / devise /
      // pays. Remplace l'ancienne liste explicite ["card","paypal",…] qui limitait l'offre
      // et imposait le gating manuel de Klarna.
      // ⚠️ Sur les Checkout Sessions, ce mode auto s'obtient en OMETTANT payment_method_types :
      //    il n'existe PAS de champ automatic_payment_methods ici (c'est un champ PaymentIntents).
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
        shipping_zone:    shippingZone,
        country:          shippingCountry,
      },
    };

    if (isFrance) {
      if (delivery_type === "home") {
        sessionParams.shipping_address_collection = {
          allowed_countries: ["FR"],
        };
      }
    } else {
      // International : Stripe collecte l'adresse de livraison du pays sélectionné
      // (aucun point relais / retrait hors France dans ce lot).
      sessionParams.shipping_address_collection = {
        allowed_countries: [shippingCountry],
      };
      // International : Stripe collecte AUSSI le téléphone (pas saisi dans le tunnel).
      sessionParams.phone_number_collection = { enabled: true };

      // Pré-remplissage adresse (compte) : on crée un Customer Stripe avec une adresse
      // de livraison par défaut → Checkout pré-remplit le formulaire (le client peut la
      // MODIFIER, Stripe reste maître). On passe alors `customer` et on retire
      // customer_creation/customer_email (incompatibles). BEST-EFFORT : si la création
      // échoue, on retombe sur la collecte Stripe à vide (jamais de blocage du paiement).
      // NB : on n'injecte PAS home_address → le webhook prend l'adresse FINALE de Stripe.
      const pf: any = shipping_prefill ?? null;
      const pfName = pf ? String(pf.name ?? `${pf.first_name ?? ""} ${pf.last_name ?? ""}`).trim() : "";
      if (pf && pf.line1 && pf.postal_code && pf.city) {
        try {
          const cust = await stripe.customers.create({
            ...(customer_email ? { email: customer_email } : {}),
            ...(pfName ? { name: pfName } : {}),
            shipping: {
              name: pfName || "Client",
              address: {
                line1:       String(pf.line1),
                line2:       String(pf.line2 ?? ""),
                postal_code: String(pf.postal_code),
                city:        String(pf.city),
                country:     shippingCountry,
              },
            },
          });
          sessionParams.customer = cust.id;
          delete sessionParams.customer_creation;
          delete sessionParams.customer_email;
        } catch (e: any) {
          process.env.NODE_ENV !== "production" && console.error("[create-session] prefill customer:", e?.message);
        }
      }
    }

    // ── Coupon UNIQUE = promo classique + code parrain + récompenses ──────────
    // Stripe n'autorise qu'UN discount par session → tous les montants sont
    // cumulés dans un seul amount_off. Clé idempotente STABLE (panier + toutes
    // les remises + email) : un retry/double-clic du même panier réutilise le
    // même coupon ; un panier ou une remise différente → clé distincte.
    const totalDiscount = serverDiscount + parrainDiscount + rewardDiscount;
    if (totalDiscount > 0) {
      const cartSig = [
        ...validatedItems.map(i => `${i.id}:${i.quantity}`),
        ...draftPacks.map(p => `pack:${p.pack_id}:${p.size ?? ""}:${p.quantity}`),
        `promo:${serverPromoCodes.join("+")}`,
        `parrain:${parrainApplied ? validParrainCode : ""}`,
        `rewards:${consumedRewardIds.join("+")}`,
      ].join(",");
      const cartHash = crypto.createHash("sha1").update(cartSig).digest("hex").slice(0, 12);
      const idempotencyKey = `coupon-${Math.round(totalDiscount * 100)}-${customer_email ?? "guest"}-${cartHash}`;
      const parts = [
        serverPromoCodes.length > 1 ? `codes ${serverPromoCodes.join(" + ")}` : (serverPromoCode && `code ${serverPromoCode}`),
        parrainDiscount > 0 && "parrain",
        rewardDiscount > 0 && "récompenses",
      ].filter(Boolean) as string[];
      const coupon = await stripe.coupons.create({
        amount_off: Math.round(totalDiscount * 100),
        currency:   "eur",
        duration:   "once",
        name:       `Remise M!LK (${parts.join(" + ") || "remise"})`.slice(0, 40),
      }, { idempotencyKey });
      sessionParams.discounts = [{ coupon: coupon.id }];
    }

    // ✅ Vérification montant minimum Stripe (0.50€)
    const finalTotal = Math.max(0, subtotal - totalDiscount) + deliveryCost;
    if (finalTotal < 0.50) {
      await releaseRewards(reservedRewardIdsInFlight); // R2 : libérer (session non créée)
      return Response.json({ error: "Le montant total est trop faible pour être traité (minimum 0.50€)" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    // Lien retour draft ↔ session (le webhook retrouvera aussi par pending_order_id).
    await supabaseServer.from("pending_orders").update({ stripe_session_id: session.id }).eq("id", pendingOrderId);
    return Response.json({ url: session.url });

  } catch (error: any) {
    process.env.NODE_ENV !== "production" && console.error("Checkout error:", error);
    await releaseRewards(reservedRewardIdsInFlight); // R2 : libérer les récompenses réservées sur échec
    return Response.json({ error: error.message ?? "Erreur serveur" }, { status: 500 });
  }
}
