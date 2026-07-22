// TVA — M!LK (EKBH SASU) est ASSUJETTIE À LA TVA au taux normal FR 20 % (textile). Les prix en base
// (products.price_ttc) et orders.amount_total sont TTC → la TVA se calcule « EN DEDANS » :
// HT = TTC / 1,20 ; TVA = TTC − HT. Les montants encaissés côté client NE CHANGENT PAS.
// Source UNIQUE réutilisée par le webhook (ventilation à la commande), la comptabilité, les factures,
// le journal et les exports → aucune duplication du taux ni de la formule.

export const TVA_RATE     = 0.20; // 20 % (taux normal FR)
export const TVA_RATE_PCT = 20;   // pour affichage + colonne orders.taux_tva

function round2(n: number): number { return Math.round((Number(n) || 0) * 100) / 100; }

/** Part de TVA contenue dans un montant TTC (en dedans). */
export function tvaFromTTC(ttc: number): number {
  return round2((Number(ttc) || 0) * TVA_RATE / (1 + TVA_RATE));
}

/** Montant HT correspondant à un montant TTC (en dedans). */
export function htFromTTC(ttc: number): number {
  return round2((Number(ttc) || 0) / (1 + TVA_RATE));
}

/**
 * Ventilation complète d'un montant TTC → { ht, tva, ttc, ratePct }.
 * ht + tva === ttc (au centime) : la TVA est la DIFFÉRENCE (évite toute dérive d'arrondi).
 */
export function ventilateTTC(ttc: number): { ht: number; tva: number; ttc: number; ratePct: number } {
  const t  = round2(ttc);
  const ht = htFromTTC(t);
  return { ht, tva: round2(t - ht), ttc: t, ratePct: TVA_RATE_PCT };
}
