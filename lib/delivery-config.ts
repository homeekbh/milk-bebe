/**
 * Source unique de vérité pour les options de livraison M!LK.
 *
 * Avant : DELIVERY_PRICES était dupliqué dans
 *   - app/panier/page.tsx (affichage)
 *   - app/api/checkout/create-session/route.ts (facturation Stripe)
 * Risque : tarif désynchronisé → client paie ≠ ce qu'il a vu au panier.
 *
 * Ce fichier est l'unique référence. Toute modif de tarif/délai/combinaison se
 * fait ici, et les deux côtés (UI + Stripe session) le lisent.
 */

export type Carrier      = "mondial_relay" | "colissimo";
export type DeliveryType = "point_relais" | "locker" | "home";

/**
 * Matrice carrier × type → prix TTC en euros.
 * Une combinaison absente = non proposée (ex: Colissimo Locker n'existe pas).
 */
export const DELIVERY_PRICES: Record<Carrier, Partial<Record<DeliveryType, number>>> = {
  mondial_relay: {
    point_relais: 3.50,
    locker:       3.50,
    home:         5.20,
  },
  colissimo: {
    point_relais: 5.90,
    home:         7.70,
    // locker non disponible chez Colissimo — la clé est volontairement absente
  },
};

/** Délais d'acheminement affichés par carrier (depuis l'expédition). */
export const DELIVERY_DELAY: Record<Carrier, string> = {
  mondial_relay: "3-4 jours ouvrés",
  colissimo:     "2-3 jours ouvrés",
};

/** Liste blanche des valeurs autorisées côté API. */
export const ALLOWED_CARRIERS:       readonly Carrier[]      = ["mondial_relay", "colissimo"];
export const ALLOWED_DELIVERY_TYPES: readonly DeliveryType[] = ["point_relais", "locker", "home"];

/**
 * Vrai si la combinaison existe et que son prix est défini (> 0).
 * Sert aux validations API et au filtrage UI.
 */
export function isDeliveryCombinationAllowed(carrier: string, type: string): boolean {
  if (!ALLOWED_CARRIERS.includes(carrier as Carrier))           return false;
  if (!ALLOWED_DELIVERY_TYPES.includes(type as DeliveryType))    return false;
  const price = DELIVERY_PRICES[carrier as Carrier]?.[type as DeliveryType];
  return typeof price === "number" && price > 0;
}

/** Tarif TTC d'une combinaison (0 si non valide ou non proposée). */
export function getDeliveryPrice(carrier: string, type: string): number {
  return DELIVERY_PRICES[carrier as Carrier]?.[type as DeliveryType] ?? 0;
}

/** Label affiché côté Stripe pour chaque combinaison. */
export function deliveryLabel(carrier: string, type: string): string {
  const map: Record<Carrier, Record<DeliveryType, string>> = {
    mondial_relay: {
      point_relais: "Mondial Relay Point Relais",
      locker:       "Mondial Relay Locker",
      home:         "Mondial Relay Domicile",
    },
    colissimo: {
      point_relais: "Colissimo Point Relais",
      locker:       "Colissimo Locker", // non proposé en pratique
      home:         "Colissimo Domicile",
    },
  };
  return map[carrier as Carrier]?.[type as DeliveryType] ?? `${carrier} ${type}`;
}

// ─────────────────────────────────────────────────────────────────────────────
//                              computeShipping
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Métadonnées d'une promo telles que renvoyées par lib/promo-validate.ts.
 * `free_shipping` = le code lui-même donne la livraison (type=free_shipping
 * ou flag free_shipping=true en DB). N'inclut PAS la logique du seuil.
 * `cumulable_avec_livraison` = TRUE → le seuil automatique s'applique en plus.
 * FALSE → un code %/€ non cumulable désactive le seuil.
 */
export type PromoShippingInput = {
  free_shipping:            boolean;
  cumulable_avec_livraison: boolean;
};

export type ShippingDecisionReason =
  | "no-shipping-needed"     // basePrice = 0 (carrier/type pas encore choisi)
  | "promo-free-shipping"    // le code lui-même offre la livraison
  | "promo-blocks-cumul"     // code %/€ non cumulable → seuil désactivé
  | "threshold-reached"      // pas de promo OU promo cumulable + subtotal ≥ seuil
  | "below-threshold";       // tout autre cas → port payant

export type ShippingDecision = {
  /** Montant TTC du port à facturer (0 = offert). */
  shipping:     number;
  /** True si offert (équivaut à shipping === 0 ET basePrice > 0). */
  shippingFree: boolean;
  /** Raison de la décision (debug / UI badges). */
  reason:       ShippingDecisionReason;
};

/**
 * Décide du montant de port à facturer.
 *
 * Règles (Option A — seuil évalué sur subtotal BRUT, avant remise) :
 *   1. basePrice ≤ 0          → shipping=0  (rien à facturer)
 *   2. promo.free_shipping     → shipping=0  (livraison offerte par le code)
 *   3. promo non cumulable     → shipping=basePrice (seuil désactivé)
 *   4. subtotal ≥ seuil        → shipping=0  (seuil atteint sur le brut)
 *   5. sinon                   → shipping=basePrice
 *
 * Source unique appelée par :
 *   - app/panier/page.tsx (affichage)
 *   - app/api/checkout/create-session/route.ts (facturation Stripe)
 *
 * Garantie : panier affiché = stripe facturé = webhook persisté.
 */
export function computeShipping(params: {
  subtotal:              number;
  freeShippingThreshold: number;
  basePrice:             number;
  promo:                 PromoShippingInput | null;
}): ShippingDecision {
  const { subtotal, freeShippingThreshold, basePrice, promo } = params;

  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    return { shipping: 0, shippingFree: false, reason: "no-shipping-needed" };
  }

  // 1. Le code offre la livraison sans condition
  if (promo?.free_shipping) {
    return { shipping: 0, shippingFree: true, reason: "promo-free-shipping" };
  }

  // 2. Promo %/€ non cumulable → désactive le seuil automatique
  if (promo && promo.cumulable_avec_livraison === false) {
    return { shipping: basePrice, shippingFree: false, reason: "promo-blocks-cumul" };
  }

  // 3. Pas de blocage → seuil sur subtotal BRUT (Option A)
  if (Number.isFinite(subtotal) && subtotal >= freeShippingThreshold) {
    return { shipping: 0, shippingFree: true, reason: "threshold-reached" };
  }

  // 4. Default : port payant
  return { shipping: basePrice, shippingFree: false, reason: "below-threshold" };
}
