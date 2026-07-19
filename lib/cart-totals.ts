/**
 * Source UNIQUE du calcul panier (produits + packs). Fonction PURE utilisée :
 *   - client : app/[locale]/panier/page.tsx (affichage)
 *   - serveur : app/api/checkout/create-session/route.ts (facturation — fait foi)
 * Garantit que l'affiché = le facturé.
 *
 * Ordre de calcul (décisions actées) :
 *   1. sous-total = Σ produits (unitaire × qty) + Σ packs (FORFAIT × qty)
 *   2. remise = promo appliqué sur le sous-total COMPLET (produits + packs)
 *   3. totalApresPromo = sous-total − remise
 *   4. livraison : seuil 60€ testé sur le TOTAL APRÈS PROMO (≠ ancien brut)
 *   5. total = totalApresPromo + port
 * Exceptions conservées via computeShipping : free_shipping force l'offerte ;
 * promo non cumulable (cumulable_avec_livraison === false) → port payant.
 */
import { computeShipping, type PromoShippingInput, type ShippingDecision } from "./delivery-config";

export type CartTotalsInput = {
  productsSubtotal:      number;
  packsSubtotal:         number;
  discount:              number;            // remise € (0 si promo free_shipping)
  basePrice:             number;            // port du transporteur choisi (0 si aucun)
  freeShippingThreshold: number;
  promo:                 PromoShippingInput | null;
};

export type CartTotals = {
  subtotal:        number;
  totalAfterPromo: number;
  shipping:        number;
  shippingFree:    boolean;
  reason:          ShippingDecision["reason"];
  total:           number;
};

export function computeCartTotals(i: CartTotalsInput): CartTotals {
  const subtotal        = (Number(i.productsSubtotal) || 0) + (Number(i.packsSubtotal) || 0);
  const totalAfterPromo = Math.max(0, subtotal - (Number(i.discount) || 0));

  // ⚠️ Seuil livraison évalué sur le TOTAL APRÈS PROMO (et non plus le brut).
  const dec = computeShipping({
    subtotal:              totalAfterPromo,
    freeShippingThreshold: i.freeShippingThreshold,
    basePrice:             i.basePrice,
    promo:                 i.promo,
  });

  return {
    subtotal,
    totalAfterPromo,
    shipping:     dec.shipping,
    shippingFree: dec.shippingFree,
    reason:       dec.reason,
    total:        totalAfterPromo + dec.shipping,
  };
}

/**
 * Variante INTERNATIONALE : port FIXE de zone, JAMAIS gratuit (aucun seuil de
 * gratuité hors France — cf. isFreeShippingEligibleZone). NE touche PAS
 * computeCartTotals (chemin France). Le crédit promo/parrainage est déjà retiré
 * par l'appelant via `discount`, exactement comme pour computeCartTotals ; on ne
 * fait qu'ajouter le port de zone.
 */
export function computeInternationalCartTotals(i: {
  productsSubtotal: number;
  packsSubtotal:    number;
  discount:         number;
  zonePrice:        number; // getInternationalShippingPrice(country) — toujours facturé
}): CartTotals {
  const subtotal        = (Number(i.productsSubtotal) || 0) + (Number(i.packsSubtotal) || 0);
  const totalAfterPromo = Math.max(0, subtotal - (Number(i.discount) || 0));
  const shipping        = Math.max(0, Number(i.zonePrice) || 0);
  return {
    subtotal,
    totalAfterPromo,
    shipping,
    shippingFree: false,          // international : jamais offert
    reason:       "below-threshold",
    total:        totalAfterPromo + shipping,
  };
}
