import { supabaseServer } from "@/lib/server/supabase";
import { combinePromos, PROMO_CAP_RATE, type ValidatedPromo, type PromoComboResult, type PromoComboEntry } from "@/lib/promo-combine";

// Ré-export pour les consommateurs existants (create-session, panier).
export { combinePromos, PROMO_CAP_RATE };
export type { ValidatedPromo, PromoComboResult, PromoComboEntry };

/**
 * Validation d'un code promo — source unique réutilisable.
 *
 * Appelée par :
 *   - app/api/promo/validate/route.ts   (validation client temps réel)
 *   - app/api/checkout/create-session/route.ts (RE-VALIDATION serveur pour
 *     empêcher tout client malveillant de forger discount/free_shipping)
 *
 * IMPORTANT : `free_shipping` retourné ici est CODE-DRIVEN uniquement —
 * il vaut true UNIQUEMENT si le code lui-même offre la livraison
 * (type=free_shipping ou flag free_shipping=true en DB).
 * Le seuil automatique (free_shipping_threshold) est appliqué APRÈS,
 * dans computeShipping() de lib/delivery-config.ts. Cette séparation
 * permet à computeShipping de connaître à la fois "le code donne le
 * port gratuit" ET "la cumulabilité avec le seuil".
 */

export type PromoValidationOk = {
  valid:                   true;
  promo_id:                string;
  code:                    string;
  type:                    string;     // "percent" | "fixed" | "free_shipping"
  value:                   number;     // valeur brute saisie admin
  discount:                number;     // remise produits TTC (0 si free_shipping)
  free_shipping:           boolean;    // code-driven uniquement
  cumulable_avec_livraison: boolean;   // passthrough DB, default true
  cumulable:               boolean;    // accepte le cumul avec d'AUTRES codes (étape 21)
  cumulable_codes:         string[];   // codes explicitement déclarés compatibles
  // ── Portée (Lot 7a/7c) — AJOUT ADDITIF (sur-ensemble). combinePromos/validatePromoCombo les
  //    IGNORENT (ils lisent un sous-ensemble). Consommés par le moteur scopé (lib/promo-scope-adapter). ──
  min_order:               number | null;   // seuil brut saisi admin (le contrôle legacy reste interne)
  scope_type:              string;          // DB : 'all' | 'category' | 'product' (défaut 'all' si absent)
  scope_value:             string | null;   // category_slug si scope_type='category', sinon null
  scope_product_ids:       string[];        // ids produits si scope_type='product', sinon []
};

export type PromoValidationKo = {
  valid:   false;
  error:   string;
  status:  number;
};

export type PromoValidationResult = PromoValidationOk | PromoValidationKo;

export async function validatePromoCode(
  rawCode: string,
  subtotal: number
): Promise<PromoValidationResult> {
  if (!rawCode || !rawCode.trim()) {
    return { valid: false, error: "Code manquant", status: 400 };
  }
  const code = rawCode.toUpperCase().trim();

  const { data, error } = await supabaseServer
    .from("promo_codes")
    .select("*")
    .eq("code", code)
    .eq("active", true)
    .single();

  if (error || !data) {
    return { valid: false, error: "Code invalide ou expiré", status: 404 };
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false, error: "Ce code a expiré", status: 400 };
  }
  if (data.starts_at && new Date(data.starts_at) > new Date()) {
    return { valid: false, error: "Ce code n'est pas encore actif", status: 400 };
  }
  if (data.max_uses !== null && data.uses_count >= data.max_uses) {
    return { valid: false, error: "Ce code a atteint son nombre maximum d'utilisations", status: 400 };
  }

  const total = Number.isFinite(subtotal) ? subtotal : 0;

  if (data.min_order && total < Number(data.min_order)) {
    return { valid: false, error: `Montant minimum requis : ${Number(data.min_order).toFixed(2)} €`, status: 400 };
  }

  // Compatibilité ancien schéma : type/value ou discount_type/discount_value
  const promoType  = (data.type ?? data.discount_type ?? "").toString();
  const promoValue = Number(data.value ?? data.discount_value ?? 0);

  let discount       = 0;
  let codeDrivenFree = false;

  if (promoType === "percent") {
    discount = Math.round((total * promoValue) / 100 * 100) / 100;
  } else if (promoType === "fixed") {
    discount = Math.min(promoValue, total);
  } else if (promoType === "free_shipping") {
    codeDrivenFree = true;
    // Pas de discount produits — le port à 0 est appliqué par computeShipping.
  }

  // Flag orthogonal : un code %/€ peut aussi cocher "offre la livraison".
  if (data.free_shipping === true) {
    codeDrivenFree = true;
  }

  // Default true : null/undefined/true → cumul OK avec le seuil automatique.
  // Seule la valeur explicite FALSE bloque le cumul.
  const cumulable = data.cumulable_avec_livraison !== false;

  return {
    valid:                    true,
    promo_id:                 data.id,
    code:                     data.code,
    type:                     promoType,
    value:                    promoValue,
    discount,
    free_shipping:            codeDrivenFree,
    cumulable_avec_livraison: cumulable,
    cumulable:                data.cumulable === true,
    cumulable_codes:          Array.isArray(data.cumulable_codes)
                                ? data.cumulable_codes.map((c: any) => String(c).toUpperCase().trim()).filter(Boolean)
                                : [],
    // ── Portée (additif) — defaults DÉFENSIFS si colonnes 028/029 non encore migrées : 'all' / null / [].
    min_order:                data.min_order != null ? Number(data.min_order) : null,
    scope_type:               typeof data.scope_type === "string" ? data.scope_type : "all",
    scope_value:              data.scope_value != null ? String(data.scope_value) : null,
    scope_product_ids:        Array.isArray(data.scope_product_ids) ? data.scope_product_ids.map((x: any) => String(x)) : [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Cumul de PLUSIEURS codes promo classiques (étape 21) — payment-critical.
// La combinaison PURE (ordre fixe→%, compat mutuelle, plafond 60 %) vit dans
// lib/promo-combine.ts (testable, sans I/O). Ici : validation DB puis combine.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Valide (DB) chaque code puis combine. Le plafond « tous discounts confondus »
 * (incluant parrain/récompenses) est ré-appliqué à create-session, seul endroit
 * qui connaît l'ensemble.
 */
export async function validatePromoCombo(rawCodes: string[], subtotal: number): Promise<PromoComboResult> {
  const seen = new Set<string>();
  const codes: string[] = [];
  for (const c of rawCodes ?? []) {
    const k = String(c ?? "").toUpperCase().trim();
    if (k && !seen.has(k)) { seen.add(k); codes.push(k); }
  }
  if (codes.length === 0) return { valid: false, error: "Aucun code", status: 400 };

  const promos: ValidatedPromo[] = [];
  for (const code of codes) {
    const v = await validatePromoCode(code, subtotal);
    if (!v.valid) return { valid: false, error: v.error, status: v.status, rejectedCode: code };
    promos.push({
      code: v.code, type: v.type, value: v.value,
      free_shipping: v.free_shipping, cumulable_avec_livraison: v.cumulable_avec_livraison,
      cumulable: v.cumulable, cumulable_codes: v.cumulable_codes,
    });
  }
  return combinePromos(promos, subtotal);
}
