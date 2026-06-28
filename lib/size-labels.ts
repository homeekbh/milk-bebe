// ──────────────────────────────────────────────────────────────────────────
// Tailles — traduction À L'AFFICHAGE UNIQUEMENT.
//
// ⚠️ NE JAMAIS utiliser ces labels comme valeur métier. Les tailles vivent en
// base (products.sizes, jsonb) en FRANÇAIS et servent de CLÉ partout :
// sizes_stock, panier (CartContext), composition du nom de ligne Stripe,
// commandes, alertes réassort. On ne traduit que le texte visible par
// l'utilisateur via getSizeLabel() — la valeur FR d'origine reste inchangée.
//
// Source de vérité unique des libellés taille FR↔EN.
//
// Clés = valeurs RÉELLES de products.sizes (vérifiées en base) :
//   "Naissance", "0-3 mois", "3-6 mois", "0-6 mois", "Taille unique", "120×120 cm".
// + "Nouveau-né" / "6-12 mois" : libellés présents UNIQUEMENT dans le tableau
//   guide des tailles (pas des valeurs DB), ajoutés pour traduire le guide.
// ──────────────────────────────────────────────────────────────────────────

export const SIZE_LABELS: Record<string, Record<string, string>> = {
  fr: {
    "Naissance":     "Naissance",
    "Nouveau-né":    "Nouveau-né",
    "0-3 mois":      "0-3 mois",
    "3-6 mois":      "3-6 mois",
    "6-12 mois":     "6-12 mois",
    "0-6 mois":      "0-6 mois",
    "Taille unique": "Taille unique",
    "120×120 cm":    "120×120 cm",
  },
  en: {
    "Naissance":     "Newborn",
    "Nouveau-né":    "Newborn",
    "0-3 mois":      "0-3 months",
    "3-6 mois":      "3-6 months",
    "6-12 mois":     "6-12 months",
    "0-6 mois":      "0-6 months",
    "Taille unique": "One size",
    "120×120 cm":    "120×120 cm",
  },
};

/**
 * Retourne le libellé d'affichage d'une taille pour la locale donnée.
 * Fallback : la valeur d'origine si aucune traduction (jamais de vide).
 */
export function getSizeLabel(size: string, locale: string): string {
  return SIZE_LABELS[locale]?.[size] ?? size;
}
