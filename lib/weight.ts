// ── POIDS D'EXPÉDITION (bug #5) — source UNIQUE partagée create-session ⇄ webhook (pack) ────────────
// Emballage = forfait UNIQUE par commande (1 seul colis quelle que soit la quantité : sachet, ou petit
// carton si beaucoup d'articles). DEFAULT = fallback si un produit n'a pas encore de weight_g en base.
// ⚠️ Ne PAS dupliquer ces constantes / cette formule ailleurs : le chemin unifié (create-session) ET le
//    chemin coffret (webhook handlePackOrder) DOIVENT importer d'ici pour rester identiques.

export const PACKAGING_WEIGHT_G    = 250; // forfait emballage, 1× par commande
export const DEFAULT_ITEM_WEIGHT_G = 250; // par article sans poids renseigné

// Poids net d'un produit (products.weight_g), avec fallback nommé + avertissement.
export function resolveItemWeightG(product: any): number {
  const w = Number(product?.weight_g);
  if (Number.isFinite(w) && w > 0) return w;
  console.warn(`[weight] poids weight_g manquant pour "${product?.name ?? product?.id ?? "?"}" → défaut ${DEFAULT_ITEM_WEIGHT_G} g`);
  return DEFAULT_ITEM_WEIGHT_G;
}
