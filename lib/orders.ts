/**
 * lib/orders.ts — Source unique de vérité pour les calculs comptables sur les commandes.
 *
 * Règle M!LK pour le CA:
 *   Une commande contribue au CA si son `status` fait partie du cycle de vie
 *   normal d'une vente encaissée:
 *     - 'payee', 'en_preparation', 'expediee', 'livree', 'rembours_partiel'
 *   ⚠️ Depuis le sync status←shipping_status (commit cf4cf33), la colonne
 *   `status` reflète AUSSI l'avancement d'expédition. Une commande expédiée ou
 *   livrée a donc status='expediee'/'livree' — elle DOIT compter dans le CA.
 *
 *   Exclues du CA:
 *     - status ∈ { 'remboursee', 'annulee', 'echec_paiement', 'litige', 'litige_gagne' }
 *     - shipping_status ∈ { 'annulee', 'retour' }
 *   ⚠️ Statuts réellement ÉCRITS par le code (audit orders.status) :
 *     - 'echec_paiement' : webhook payment_failed (route.ts:1244) — RARE : uniquement si une
 *       commande NON-terminale existe pour le payment_intent échoué. Les commandes étant créées
 *       en 'payee', ce cas ne se réalise quasi jamais → « inexistant en base » observé, MAIS la
 *       branche existe. On GARDE l'exclusion : la retirer serait un bug latent (si un jour une
 *       commande échoue, elle ne doit pas compter dans le CA).
 *     - 'litige' / 'litige_gagne' : webhook charge.dispute (route.ts:1424 / :1495). 'litige_gagne'
 *       = dispute GAGNÉE = argent CONSERVÉ → exclu ici PAR PRUDENCE. À CONFIRMER (Bou) : si les
 *       litiges gagnés doivent compter dans le CA, déplacer 'litige_gagne' vers VALID_STATUSES.
 *
 *   Montant net:
 *     - 'rembours_partiel' → amount_total - refund_amount (clamp à 0)
 *     - tous les autres statuts valides → amount_total
 *
 * Utilisé par:
 *   - app/admin/page.tsx (dashboard)
 *   - app/admin/analytics/page.tsx (statistiques)
 *   - app/admin/clients/page.tsx (CA par client)
 *   - app/api/admin/export/commandes/route.ts (export CSV)
 *   - app/api/admin/analytics/* (KPIs server-side)
 */

export type OrderForCalc = {
  status?:           string | null;
  shipping_status?:  string | null;
  amount_total?:     number | null;
  refund_amount?:    number | null;
  [k: string]: any;
};

// Statuts paiement/cycle qui comptent dans le CA.
export const VALID_STATUSES = [
  "payee",
  "en_preparation",
  "expediee",
  "livree",
  "rembours_partiel",
];

// Statuts paiement qui EXCLUENT du CA.
const EXCLUDED_STATUSES = ["remboursee", "annulee", "echec_paiement", "litige", "litige_gagne"];

/**
 * Renvoie true si la commande compte dans le CA.
 * Une commande sans status (très anciennes commandes pré-migration) est
 * considérée valide tant que shipping_status n'est pas annulee/retour.
 */
export function isValidOrder(o: OrderForCalc): boolean {
  // Commande de test interne (Bou/Claude) marquée depuis l'admin → jamais dans le CA
  // ni les dashboards. N'a d'effet que si la requête a SÉLECTIONNÉ is_internal_test
  // (sinon undefined → commande conservée : défaut sûr).
  if (o?.is_internal_test === true) return false;

  const s  = String(o?.status ?? "").toLowerCase();
  const sh = String(o?.shipping_status ?? "").toLowerCase();

  // Statuts paiement qui excluent du CA (remboursement total / annulation / échec)
  if (EXCLUDED_STATUSES.includes(s)) return false;

  // Statuts livraison qui excluent du CA
  if (sh === "annulee" || sh === "retour") return false;

  // Si un status est défini, il doit faire partie des statuts valides.
  // (status vide = anciennes commandes → on garde, géré ci-dessus par EXCLUDED.)
  if (s && !VALID_STATUSES.includes(s)) return false;

  return true;
}

/**
 * Renvoie le montant qui contribue réellement au CA.
 * - 'rembours_partiel' : amount_total - refund_amount (clamp à 0).
 * - tous les autres statuts valides : amount_total.
 */
export function getNetAmount(o: OrderForCalc): number {
  const total = Number(o?.amount_total ?? 0);
  const s     = String(o?.status ?? "").toLowerCase();

  if (s === "rembours_partiel") {
    const refund = Number(o?.refund_amount ?? 0);
    return Math.max(0, total - refund);
  }
  return Math.max(0, total);
}

/**
 * Helper combiné: somme le CA net d'une liste de commandes en filtrant.
 */
export function sumValidCA(orders: OrderForCalc[]): number {
  return orders.filter(isValidOrder).reduce((s, o) => s + getNetAmount(o), 0);
}

// ── PÉRIMÈTRE PAR CLASSIFICATION (Lot 3b) ────────────────────────────────────
// Deux prédicats de périmètre, EN PLUS de isValidOrder (tests / annulations /
// remboursements restent exclus exactement comme aujourd'hui) :
//   - countsInAccounting : CA COMPTABLE (factures, TVA, comptabilité) → 'cliente'
//     + 'vente_directe'. Une vente physique est de l'argent réellement encaissé.
//   - countsInWebStats   : STATS WEB (conversion, panier moyen, analytics, top
//     produits/clients, geo, promos, rétention) → 'cliente' UNIQUEMENT. Une vente
//     physique n'a produit ni visite ni panier → elle fausserait la conversion.
// 'influenceuse' et 'cadeau' sont exclus des DEUX. 'test' n'est PAS une
// classification : les tests restent gérés par is_internal_test (dans isValidOrder) —
// un seul mécanisme, on n'en crée surtout pas un second.
//
// ⚠️ MÊME GARDE-FOU QUE is_internal_test (cf. isValidOrder l.66) : la colonne
// `classification` n'a d'effet QUE si la requête l'a SÉLECTIONNÉE. Absente
// (undefined / null / "") → traitée comme 'cliente' → RÉTROCOMPATIBLE : aucune
// commande légitime ne disparaît par accident, et les commandes d'avant la migration
// (sans classification) comptent normalement. REVERS ASSUMÉ : le même piège de no-op
// qu'avec is_internal_test — une requête qui OUBLIE de sélectionner `classification`
// n'exclura PAS les vente_directe / influenceuse / cadeau. Donc TOUTE requête utilisant
// ces prédicats DOIT sélectionner `classification` (ET `is_internal_test`).
const ACCOUNTING_CLASSES = new Set(["cliente", "vente_directe"]);
const WEB_STATS_CLASSES  = new Set(["cliente"]);

/** Classification effective : absente/vide → 'cliente' (défaut rétrocompatible). */
function classificationOf(o: OrderForCalc): string {
  const c = o?.classification;
  return c == null || c === "" ? "cliente" : String(c).toLowerCase();
}

/** Compte dans le CA COMPTABLE (cliente + vente_directe) — commandes valides seulement. */
export function countsInAccounting(o: OrderForCalc): boolean {
  return isValidOrder(o) && ACCOUNTING_CLASSES.has(classificationOf(o));
}

/** Compte dans les STATS WEB (cliente uniquement) — commandes valides seulement. */
export function countsInWebStats(o: OrderForCalc): boolean {
  return isValidOrder(o) && WEB_STATS_CLASSES.has(classificationOf(o));
}
