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
