/**
 * lib/orders.ts — Source unique de vérité pour les calculs comptables sur les commandes.
 *
 * Règle ABSOLUE M!LK pour le CA:
 *   Une commande contribue au CA si:
 *     - status ∈ { 'payee', 'rembours_partiel' }
 *     - status ∉ { 'remboursee', 'annulee', 'echec_paiement' }
 *     - shipping_status ≠ 'annulee'
 *     - shipping_status ≠ 'retour'
 *   Pour rembours_partiel: montant net = amount_total - refund_amount
 *
 * Utilisé par:
 *   - app/admin/page.tsx (dashboard)
 *   - app/admin/analytics/page.tsx (statistiques)
 *   - app/admin/clients/page.tsx (CA par client)
 *   - app/api/admin/export/commandes/route.ts (export CSV)
 */

export type OrderForCalc = {
  status?:           string | null;
  shipping_status?:  string | null;
  amount_total?:     number | null;
  refund_amount?:    number | null;
  [k: string]: any;
};

/**
 * Renvoie true si la commande compte dans le CA.
 * Une commande sans status (très anciennes commandes pré-migration) est considérée
 * valide tant que shipping_status n'est pas annulee/retour.
 */
export function isValidOrder(o: OrderForCalc): boolean {
  const s  = String(o?.status ?? "").toLowerCase();
  const sh = String(o?.shipping_status ?? "").toLowerCase();

  // Statuts paiement qui excluent du CA
  if (s === "remboursee" || s === "annulee" || s === "echec_paiement") return false;

  // Statuts livraison qui excluent du CA
  if (sh === "annulee" || sh === "retour") return false;

  // Si status défini mais pas dans les statuts "valides", exclure
  // (geste défensif : un status inconnu = on n'ose pas le compter)
  if (s && s !== "payee" && s !== "rembours_partiel") return false;

  return true;
}

/**
 * Renvoie le montant qui contribue réellement au CA.
 * Pour rembours_partiel : amount_total - refund_amount (clamp à 0).
 * Pour les autres statuts valides : amount_total.
 */
export function getNetAmount(o: OrderForCalc): number {
  const total  = Number(o?.amount_total ?? 0);
  const refund = Number(o?.refund_amount ?? 0);
  return Math.max(0, total - refund);
}

/**
 * Helper combiné: somme le CA net d'une liste de commandes en filtrant.
 */
export function sumValidCA(orders: OrderForCalc[]): number {
  return orders.filter(isValidOrder).reduce((s, o) => s + getNetAmount(o), 0);
}
