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
//                              DOM-TOM (non livrés)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * DOM-TOM & COM : Guadeloupe (971), Martinique (972), Guyane (973), Réunion (974),
 * St-Pierre-et-Miquelon (975), Mayotte (976), St-Barthélemy / St-Martin (977/978),
 * Wallis-et-Futuna (986), Polynésie française (987), Nouvelle-Calédonie (988). Tous
 * ont un code postal en 97xxx / 98xxx → 5 chiffres, préfixe "97" ou "98". Livraison
 * NON assurée (coût trop élevé).
 *
 * SOURCE UNIQUE réutilisée sur le CHEMIN FRANCE du tunnel : RelaySelector (recherche
 * point relais) + CheckoutAddressForm (adresse domicile). N'affecte PAS
 * l'international (CP étrangers non concernés, et plus de saisie CP à l'international).
 */
export function isDomTom(postalCode: string): boolean {
  return /^(97|98)\d{3}$/.test(String(postalCode ?? "").trim());
}

/** Libellé UNIQUE (FR + EN) affiché quand un CP DOM-TOM est saisi (relais + domicile). */
export function domTomMessage(en: boolean): string {
  return en
    ? "We don't ship to French overseas territories yet (Guadeloupe, Martinique, Réunion…)."
    : "Nous ne livrons pas encore vers les DOM-TOM (Guadeloupe, Martinique, Réunion…).";
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

// ─────────────────────────────────────────────────────────────────────────────
//                   ZONES DE LIVRAISON — FONDATION (code INERTE)
// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ Rien du tunnel (panier / create-session / UI) n'appelle encore ce bloc :
// c'est une fondation posée pour un lot go-live international ultérieur. La FRANCE
// reste gérée par la matrice DELIVERY_PRICES ci-dessus (avec seuil de gratuité).
// L'INTERNATIONAL est TOUJOURS payant — aucun seuil de livraison offerte hors FR.

export type ShippingZone = "FR" | "EU" | "EUROPE_NON_EU" | "UK";

/**
 * Pays livrables → zone. EXHAUSTIF : tout code ISO-2 ABSENT de cette table = NON
 * livrable (US, CA, RU, DOM-TOM, Maghreb, Afrique, Asie… ne sont volontairement
 * PAS listés). La France est mappée "FR" pour la cohérence des helpers, mais son
 * tarif réel vient de DELIVERY_PRICES, pas d'INTERNATIONAL_ZONE_PRICES.
 */
export const COUNTRY_TO_ZONE: Record<string, ShippingZone> = {
  FR: "FR",
  // UE (27, hors FR) → "EU"
  AT: "EU", BE: "EU", BG: "EU", HR: "EU", CY: "EU", CZ: "EU", DK: "EU",
  EE: "EU", FI: "EU", DE: "EU", GR: "EU", HU: "EU", IE: "EU", IT: "EU",
  LV: "EU", LT: "EU", LU: "EU", MT: "EU", NL: "EU", PL: "EU", PT: "EU",
  RO: "EU", SK: "EU", SI: "EU", ES: "EU", SE: "EU",
  // Europe hors-UE → "EUROPE_NON_EU" (PAS de Russie, PAS du Royaume-Uni)
  CH: "EUROPE_NON_EU", NO: "EUROPE_NON_EU", IS: "EUROPE_NON_EU",
  // Royaume-Uni → "UK"
  GB: "UK",
};

/**
 * Prix TTC (€) de la livraison INTERNATIONALE par zone. FR n'a pas de tarif ici
 * (placeholder 0) : la France passe par DELIVERY_PRICES + seuil de gratuité, et
 * getInternationalShippingPrice() renvoie null pour FR (cf. helper).
 */
export const INTERNATIONAL_ZONE_PRICES: Record<ShippingZone, number> = {
  FR:            0,     // placeholder — la France NE se facture PAS via ce prix
  EU:            11.90,
  EUROPE_NON_EU: 14.90,
  UK:            18.90,
};

const normalizeCountryCode = (country: string): string => String(country ?? "").trim().toUpperCase();

/** Zone d'un pays (ISO-2, casse/espaces normalisés), ou null si non livrable. */
export function getZoneForCountry(country: string): ShippingZone | null {
  return COUNTRY_TO_ZONE[normalizeCountryCode(country)] ?? null;
}

/** Le pays est-il livrable ? */
export function isCountryDeliverable(country: string): boolean {
  return getZoneForCountry(country) !== null;
}

/**
 * Prix TTC de la livraison internationale d'un pays, ou null si non livrable.
 * Renvoie AUSSI null pour la France : elle relève de la matrice domestique
 * (DELIVERY_PRICES + seuil), jamais de ce helper.
 */
export function getInternationalShippingPrice(country: string): number | null {
  const zone = getZoneForCountry(country);
  if (!zone || zone === "FR") return null;
  return INTERNATIONAL_ZONE_PRICES[zone];
}

/** Liste des pays livrables avec leur zone (utilitaire / tests / futur UI). */
export function listDeliverableCountries(): { code: string; zone: ShippingZone }[] {
  return Object.entries(COUNTRY_TO_ZONE).map(([code, zone]) => ({ code, zone }));
}

/**
 * Éligible au seuil de livraison OFFERTE ? UNIQUEMENT la France ("FR").
 * L'international est TOUJOURS payant — aucun seuil de gratuité hors FR.
 */
export function isFreeShippingEligibleZone(zone: ShippingZone): boolean {
  return zone === "FR";
}
