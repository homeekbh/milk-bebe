// ═══════════════════════════════════════════════════════════════════════════
// lib/promo-scope.ts — Moteur PUR de remise des codes promo PAR PORTÉE (Lot 7b).
//
// AUCUN I/O (pas de supabase, pas de fetch) → importable et testable en isolation.
// Les codes reçus sont supposés DÉJÀ normalisés/validés côté serveur (7a normalizeScope) :
// scopeKind cohérent, categorySlug/productIds présents selon le cas.
//
// RÈGLE ABSOLUE : un produit remisé par un code n'est JAMAIS re-remisé par un autre
// (verrouillage au 1er code, dans l'ordre de saisie). Le parrain/filleul est traité
// AILLEURS (étape paiement), après ce moteur. Voir docs/plan-codes-promo.md.
// ═══════════════════════════════════════════════════════════════════════════

export type PromoScopeKind = "all" | "category" | "products";

export interface ScopedPromoCode {
  code: string;
  discountType: "percent" | "fixed";   // percent: 0-100 ; fixed: euros sur le sous-total éligible du code
  discountValue: number;
  scopeKind: PromoScopeKind;
  categorySlug?: string | null;         // requis si scopeKind === 'category'
  productIds?: string[];                // requis si scopeKind === 'products'
  minOrder?: number | null;             // seuil testé sur le RUNNING TOTAL
  freeShipping?: boolean;
}

export interface CartLine {
  productId: string;
  categorySlug: string;
  unitPriceTtc: number;
  quantity: number;
  isPack?: boolean;                     // un pack n'est couvert QUE par un code scopeKind 'all'
}

export interface ApplyOptions {
  capThreshold?: number;                // défaut 0.60 — seuil d'ALERTE, PAS un clamp
  maxCodes?: number;                    // défaut 2
  freeShippingMin?: number;             // défaut 60
  isInternational?: boolean;            // si true, freeShipping toujours false
}

export interface LineResult {
  productId: string;
  quantity: number;
  originalLineTotal: number;            // unitPriceTtc * quantity
  appliedCode: string | null;
  lineDiscount: number;
  finalLineTotal: number;               // originalLineTotal - lineDiscount, JAMAIS < 0
}

export type RejectReason =
  | "no_eligible_product"
  | "min_order_not_met"
  | "limit_reached"
  | "already_covered";

export interface RejectedCode {
  code: string;
  reason: RejectReason;
}

export interface ApplyResult {
  lines: LineResult[];
  appliedCodes: string[];               // dans l'ordre de saisie
  rejectedCodes: RejectedCode[];
  subtotal: number;
  totalDiscount: number;                // somme des lineDiscount, NON clampé à 60%
  totalAfterDiscount: number;           // subtotal - totalDiscount, JAMAIS < 0
  discountRatio: number;                // totalDiscount / subtotal (0 si subtotal=0)
  capExceeded: boolean;                 // discountRatio > capThreshold → alerte admin (7c)
  freeShipping: boolean;
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;
const toCents = (n: number): number => Math.round(n * 100);
const num = (n: unknown): number => {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
};

// État interne mutable d'une ligne (les entrées CartLine ne sont JAMAIS mutées).
interface WorkLine {
  productId: string;
  categorySlug: string;
  isPack: boolean;
  quantity: number;
  originalLineTotal: number;
  appliedCode: string | null;
  lineDiscount: number;
}

/** Une ligne est-elle COUVERTE par la portée d'un code (indépendamment du verrouillage) ? */
function coversScope(code: ScopedPromoCode, line: WorkLine): boolean {
  if (code.scopeKind === "all") return true;                 // produits ET packs
  if (line.isPack) return false;                             // 'category'/'products' ne touchent JAMAIS un pack
  if (code.scopeKind === "category") {
    return line.categorySlug === String(code.categorySlug ?? "");
  }
  if (code.scopeKind === "products") {
    const ids = Array.isArray(code.productIds) ? code.productIds.map(String) : [];
    return ids.includes(line.productId);
  }
  return false;
}

/**
 * Répartit un montant FIXE (en euros) sur des lignes éligibles, proportionnellement au poids de
 * chaque ligne, en CENTIMES ENTIERS → somme EXACTE et chaque part ≤ total de la ligne (FLOOR).
 * Méthode du plus grand reste (largest-remainder).
 */
function distributeFixed(eligible: WorkLine[], fixedEuros: number): number[] {
  const cents = eligible.map((l) => toCents(l.originalLineTotal));
  const eligTotalCents = cents.reduce((a, b) => a + b, 0);
  // Le montant fixe ne peut jamais dépasser le total éligible.
  const fixedCents = Math.min(Math.max(0, toCents(fixedEuros)), eligTotalCents);

  if (eligTotalCents <= 0 || fixedCents <= 0) return eligible.map(() => 0);

  const ideal = cents.map((c) => (fixedCents * c) / eligTotalCents);
  const alloc = ideal.map((x) => Math.floor(x));
  let remainder = fixedCents - alloc.reduce((a, b) => a + b, 0);

  // Distribue les centimes restants aux plus grosses fractions, sans jamais dépasser le total ligne.
  const order = ideal
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (remainder <= 0) break;
    if (alloc[i] < cents[i]) { alloc[i] += 1; remainder -= 1; }
  }
  // remainder résiduel (théoriquement 0 car fixedCents ≤ eligTotalCents) : ignoré (jamais > cap ligne).
  return alloc.map((c) => c / 100);
}

/**
 * Applique des codes promo à portée sur un panier. Voir l'algorithme dans docs/plan-codes-promo.md.
 * PUR : ne mute ni `cart` ni `codes`.
 */
export function applyScopedPromos(
  cart: CartLine[],
  codes: ScopedPromoCode[],
  options?: ApplyOptions,
): ApplyResult {
  const capThreshold    = options?.capThreshold ?? 0.60;
  const maxCodes        = Math.max(0, options?.maxCodes ?? 2);
  const freeShippingMin = options?.freeShippingMin ?? 60;
  const isInternational = options?.isInternational === true;

  const safeCart  = Array.isArray(cart) ? cart : [];
  const safeCodes = Array.isArray(codes) ? codes : [];

  // Lignes de travail (copies immuables des entrées).
  const lines: WorkLine[] = safeCart.map((l) => {
    const qty  = Math.max(0, num(l.quantity));
    const unit = Math.max(0, num(l.unitPriceTtc));
    return {
      productId: String(l.productId),
      categorySlug: String(l.categorySlug ?? ""),
      isPack: l.isPack === true,
      quantity: qty,
      originalLineTotal: round2(unit * qty),
      appliedCode: null,
      lineDiscount: 0,
    };
  });

  const subtotal = round2(lines.reduce((s, l) => s + l.originalLineTotal, 0));

  const appliedCodes: string[]      = [];
  const rejectedCodes: RejectedCode[] = [];
  const appliedFlags: ScopedPromoCode[] = [];
  let runningDiscount = 0; // Σ des remises des codes DÉJÀ appliqués

  // 1. Limite maxCodes : les codes considérés vs excédentaires.
  const considered = safeCodes.slice(0, maxCodes);
  const excess     = safeCodes.slice(maxCodes);

  // 2. Parcours dans l'ordre de saisie.
  for (const code of considered) {
    // a. running total = subtotal − remises déjà appliquées
    const runningTotal = round2(subtotal - runningDiscount);

    // b. seuil min_order sur le running total
    const minOrder = code.minOrder != null ? num(code.minOrder) : null;
    if (minOrder != null && runningTotal < minOrder) {
      rejectedCodes.push({ code: code.code, reason: "min_order_not_met" });
      continue; // ne verrouille RIEN
    }

    // c. cibles (portée) + éligibles (non verrouillées)
    const targets  = lines.filter((l) => coversScope(code, l));
    const eligible = targets.filter((l) => l.appliedCode === null);

    // d. aucune éligible → rejet (already_covered si des cibles existent mais verrouillées)
    if (eligible.length === 0) {
      rejectedCodes.push({
        code: code.code,
        reason: targets.length > 0 ? "already_covered" : "no_eligible_product",
      });
      continue;
    }

    // e. applique + verrouille
    let codeDiscount = 0;
    if (code.discountType === "percent") {
      const pct = num(code.discountValue);
      for (const l of eligible) {
        let d = round2((l.originalLineTotal * pct) / 100);
        if (d > l.originalLineTotal) d = l.originalLineTotal; // FLOOR dur
        if (d < 0) d = 0;
        l.lineDiscount = d;
        l.appliedCode  = code.code;
        codeDiscount   = round2(codeDiscount + d);
      }
    } else {
      // fixed : réparti proportionnellement, exact au centime, ≤ total de chaque ligne
      const parts = distributeFixed(eligible, num(code.discountValue));
      eligible.forEach((l, i) => {
        const d = parts[i];
        l.lineDiscount = d;
        l.appliedCode  = code.code;
        codeDiscount   = round2(codeDiscount + d);
      });
    }

    appliedCodes.push(code.code);
    appliedFlags.push(code);
    runningDiscount = round2(runningDiscount + codeDiscount);
  }

  // 1b. codes excédentaires → limit_reached
  for (const code of excess) {
    rejectedCodes.push({ code: code.code, reason: "limit_reached" });
  }

  // 3. Totaux + FLOOR déjà garanti par ligne.
  const totalDiscount      = round2(lines.reduce((s, l) => s + l.lineDiscount, 0));
  const totalAfterDiscount = round2(Math.max(0, subtotal - totalDiscount));
  const discountRatio      = subtotal > 0 ? totalDiscount / subtotal : 0;
  const capExceeded        = discountRatio > capThreshold; // ALERTE, jamais un clamp

  // 4. Livraison offerte : ≥1 code appliqué l'offre ET total ≥ seuil ET pas international.
  const freeShipping =
    appliedFlags.some((c) => c.freeShipping === true) &&
    totalAfterDiscount >= freeShippingMin &&
    !isInternational;

  const lineResults: LineResult[] = lines.map((l) => ({
    productId: l.productId,
    quantity: l.quantity,
    originalLineTotal: l.originalLineTotal,
    appliedCode: l.appliedCode,
    lineDiscount: round2(l.lineDiscount),
    finalLineTotal: round2(Math.max(0, l.originalLineTotal - l.lineDiscount)),
  }));

  return {
    lines: lineResults,
    appliedCodes,
    rejectedCodes,
    subtotal,
    totalDiscount,
    totalAfterDiscount,
    discountRatio,
    capExceeded,
    freeShipping,
  };
}
