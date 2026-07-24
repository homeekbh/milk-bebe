// ═══════════════════════════════════════════════════════════════════════════
// lib/promo-scope-adapter.ts — Adaptateur entre le monde DB (codes promo validés) et le moteur
// PUR lib/promo-scope.ts (Lot 7c-1, SHADOW). NE MODIFIE PAS promo-scope.ts.
//
// - toScopedPromoCode / buildCartLines / maskEmail : PURS (zéro I/O) → testables en isolation.
// - computeScopedShadow : I/O (recharge chaque code via validatePromoCode), ENVELOPPÉ en try/catch,
//   renvoie null en cas d'erreur → ne peut JAMAIS faire échouer un checkout (usage shadow uniquement).
//
// ⚠️ SHADOW : en 7c-1, le résultat n'est JAMAIS facturé (le coupon Stripe reste le calcul legacy).
// Le flip vers la facturation scopée = Lot 7c-2 (flag PROMO_ENGINE='scoped').
//
// Import de validatePromoCode fait DYNAMIQUEMENT dans computeScopedShadow : le haut de ce module
// reste sans dépendance supabase → importable en test sans clé d'environnement.
// ═══════════════════════════════════════════════════════════════════════════

import { applyScopedPromos } from "./promo-scope";
import type { ScopedPromoCode, CartLine, ApplyResult, PromoScopeKind } from "./promo-scope";

/** Ligne DB d'un code promo VALIDÉ (sous-ensemble du retour de validatePromoCode étendu). */
export type ValidatedPromoRow = {
  code: string;
  type: string;                       // 'percent' | 'fixed' | 'free_shipping'
  value: number;
  min_order?: number | null;
  free_shipping?: boolean;
  scope_type?: string | null;         // DB : 'all' | 'category' | 'product'
  scope_value?: string | null;        // category_slug si 'category'
  scope_product_ids?: string[] | null;
};

/**
 * Traduit le scope_type RÉEL de la base ('all' | 'category' | 'product') vers le contrat
 * lib/promo-scope.ts ('all' | 'category' | 'products'). Tolère 'products' (défensif) + défaut 'all'.
 */
export function mapScopeKind(dbScopeType: string | null | undefined): PromoScopeKind {
  const t = String(dbScopeType ?? "all").trim().toLowerCase();
  if (t === "category") return "category";
  if (t === "product" || t === "products") return "products"; // DB='product' → contrat='products'
  return "all";
}

/**
 * Code promo DB validé → ScopedPromoCode (contrat exact du moteur pur). PUR.
 * - discountType : 'fixed' si type='fixed', sinon 'percent'. Un code 'free_shipping' → 'percent' à 0 %
 *   (aucune remise produit) ; son bénéfice passe par freeShipping.
 * - 'category' → categorySlug = scope_value ; 'product' → productIds = scope_product_ids.
 */
export function toScopedPromoCode(row: ValidatedPromoRow): ScopedPromoCode {
  const scopeKind = mapScopeKind(row.scope_type);
  const isFreeShipType = String(row.type) === "free_shipping";
  return {
    code: String(row.code),
    discountType: !isFreeShipType && String(row.type) === "fixed" ? "fixed" : "percent",
    discountValue: isFreeShipType ? 0 : Number(row.value) || 0,
    scopeKind,
    categorySlug: scopeKind === "category" ? (row.scope_value ?? null) : null,
    productIds:
      scopeKind === "products" && Array.isArray(row.scope_product_ids)
        ? row.scope_product_ids.map(String)
        : [],
    minOrder: row.min_order != null ? Number(row.min_order) : null,
    freeShipping: row.free_shipping === true,
  };
}

/**
 * Construit les CartLine du moteur à partir des items/packs RÉSOLUS SERVEUR (DB), jamais du body.
 * PUR. Les packs reçoivent categorySlug '__pack__' (slug factice → aucun code 'category'/'products'
 * ne les vise ; seul un code 'all' les couvre, cf. A7).
 */
export function buildCartLines(
  validatedItems: Array<{ id: string; category_slug?: string | null; price: number; quantity: number }>,
  draftPacks: Array<{ pack_id: string; price: number; quantity: number }>,
): CartLine[] {
  const items: CartLine[] = (validatedItems ?? []).map((i) => ({
    productId: String(i.id),
    categorySlug: String(i.category_slug ?? ""),
    unitPriceTtc: Number(i.price) || 0,
    quantity: Number(i.quantity) || 0,
    isPack: false,
  }));
  const packs: CartLine[] = (draftPacks ?? []).map((p) => ({
    productId: String(p.pack_id),
    categorySlug: "__pack__",
    unitPriceTtc: Number(p.price) || 0,
    quantity: Number(p.quantity) || 0,
    isPack: true,
  }));
  return [...items, ...packs];
}

/** Masque un email pour le log d'observation : 1re lettre + '***@' + domaine. PUR. */
export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const s = String(email);
  const at = s.indexOf("@");
  if (at <= 0) return "***";
  return `${s[0]}***@${s.slice(at + 1)}`;
}

/**
 * SHADOW : ce que le moteur scopé PRODUIRAIT sur ce panier. Ne throw JAMAIS (try/catch → null).
 * NON facturé en 7c-1. Recharge chaque code via validatePromoCode (import dynamique) DANS L'ORDRE
 * de saisie (l'ordre compte pour le verrouillage). Un code invalide (existence/dates/max_uses/min)
 * est simplement ignoré (comme le legacy le rejetterait).
 */
export async function computeScopedShadow(args: {
  codes: string[]; // ordre de saisie
  validatedItems: Array<{ id: string; category_slug?: string | null; price: number; quantity: number }>;
  draftPacks: Array<{ pack_id: string; price: number; quantity: number }>;
  subtotal: number;
  isInternational: boolean;
}): Promise<ApplyResult | null> {
  try {
    const { validatePromoCode } = await import("./promo-validate");
    const scoped: ScopedPromoCode[] = [];
    for (const raw of args.codes ?? []) {
      const v = await validatePromoCode(raw, args.subtotal);
      if (v.valid) scoped.push(toScopedPromoCode(v));
    }
    const cart = buildCartLines(args.validatedItems, args.draftPacks);
    return applyScopedPromos(cart, scoped, {
      capThreshold: 0.60,
      maxCodes: 2,
      freeShippingMin: 60,
      isInternational: args.isInternational === true,
    });
  } catch {
    return null; // shadow uniquement : toute erreur est avalée, jamais de throw remontant
  }
}
