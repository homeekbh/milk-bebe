// ═══════════════════════════════════════════════════════════════════════════
// lib/promo-combine.ts — Combinaison PURE de codes promo classiques (étape 21).
// AUCUN I/O (pas de supabase) → importable en test unitaire. La validation DB
// (existence, actif, min_order…) vit dans lib/promo-validate.ts qui appelle ceci.
// ═══════════════════════════════════════════════════════════════════════════

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const PROMO_CAP_RATE = 0.60; // plafond global de remise cumulée (60 %)

export type PromoComboEntry = { code: string; type: string; value: number; discount: number; free_shipping: boolean };
export type PromoComboResult =
  | { valid: true; entries: PromoComboEntry[]; totalDiscount: number; free_shipping: boolean; cumulable_avec_livraison: boolean }
  | { valid: false; error: string; status: number; rejectedCode?: string };

// Code déjà validé individuellement (sans I/O) → entrée de combinePromos.
export type ValidatedPromo = {
  code: string; type: string; value: number;
  free_shipping: boolean; cumulable_avec_livraison: boolean;
  cumulable: boolean; cumulable_codes: string[];
};

/**
 * - compat MUTUELLE si ≥ 2 codes (chacun `cumulable` ET déclarant l'autre dans
 *   `cumulable_codes`, des DEUX côtés) ;
 * - ordre : montants FIXES d'abord, puis POURCENTAGES sur le reste (marge) ;
 * - plafond promo : remise cumulée > 60 % du sous-total → REFUS du dernier code.
 */
export function combinePromos(promos: ValidatedPromo[], subtotal: number): PromoComboResult {
  if (!promos || promos.length === 0) return { valid: false, error: "Aucun code", status: 400 };

  if (promos.length >= 2) {
    for (let i = 0; i < promos.length; i++) {
      for (let j = i + 1; j < promos.length; j++) {
        const a = promos[i], b = promos[j];
        if (!a.cumulable || !b.cumulable) {
          return { valid: false, error: `Le code ${!a.cumulable ? a.code : b.code} n'est pas cumulable.`, status: 400, rejectedCode: b.code };
        }
        if (!a.cumulable_codes.includes(b.code) || !b.cumulable_codes.includes(a.code)) {
          return { valid: false, error: `${a.code} et ${b.code} ne sont pas déclarés cumulables ensemble.`, status: 400, rejectedCode: b.code };
        }
      }
    }
  }

  const total = Number.isFinite(subtotal) ? Math.max(0, subtotal) : 0;
  const byCode = new Map<string, number>();
  let remaining = total;
  for (const p of promos) if (p.type === "fixed")   { const d = Math.min(p.value, remaining); byCode.set(p.code, round2(d)); remaining = round2(remaining - d); }
  for (const p of promos) if (p.type === "percent") { const d = round2(remaining * p.value / 100); byCode.set(p.code, d); remaining = round2(remaining - d); }
  for (const p of promos) if (p.type === "free_shipping") byCode.set(p.code, 0);
  const totalDiscount = round2(total - remaining);

  // Plafond 60 % : garde-fou du CUMUL uniquement (≥ 2 codes). Un code SEUL n'est
  // jamais plafonné ici — un code collab à fort % (ex. 100 %) reste intentionnel.
  if (promos.length >= 2 && total > 0 && totalDiscount > round2(total * PROMO_CAP_RATE)) {
    return { valid: false, error: `La remise cumulée dépasserait le plafond de ${Math.round(PROMO_CAP_RATE * 100)} %.`, status: 400, rejectedCode: promos[promos.length - 1].code };
  }

  return {
    valid: true,
    entries: promos.map(p => ({ code: p.code, type: p.type, value: p.value, discount: byCode.get(p.code) ?? 0, free_shipping: p.free_shipping })),
    totalDiscount,
    free_shipping:            promos.some(p => p.free_shipping),
    cumulable_avec_livraison: promos.every(p => p.cumulable_avec_livraison),
  };
}
