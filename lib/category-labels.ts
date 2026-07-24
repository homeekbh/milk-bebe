// lib/category-labels.ts — Résolution des LIBELLÉS d'affichage (catégorie / sous-catégorie).
//
// Module PUR (zéro import runtime) → testable en isolation. Les lectures DB (table categories /
// subcategories) vivent dans lib/category-labels-server.ts, qui réutilise ces résolveurs purs.
//
// Chaîne de fallback (DÉFENSIVE — fonctionne tables VIDES) :
//   1. label DB (admin, table categories/subcategories) s'il existe,
//   2. libellé hardcodé de base (par locale) pour les catégories connues,
//   3. slug capitalisé.
// Objectif : de nouvelles catégories/sous-catégories créées en admin s'affichent proprement, et
// l'existant ne régresse jamais même si aucune ligne n'a encore été saisie.

export type Locale = "fr" | "en";

/**
 * Libellés d'affichage HARDCODÉS des catégories de BASE (fallback quand la table `categories` est
 * vide/absente). Miroir des clés messages `product.cat_*` (source publique existante). Les
 * catégories NON listées ici (créées en admin) passent par la table `categories`, sinon slug.
 */
export const BASE_CATEGORY_LABELS: Record<string, { fr: string; en: string }> = {
  bodies:      { fr: "Bodies",      en: "Bodysuits" },
  pyjamas:     { fr: "Pyjamas",     en: "Pyjamas" },
  gigoteuses:  { fr: "Gigoteuses",  en: "Sleep bags" },
  accessoires: { fr: "Accessoires", en: "Accessories" },
  bonnet:      { fr: "Bonnets",     en: "Hats" },
  langes:      { fr: "Langes",      en: "Swaddles" },
};

/** slug → libellé lisible (fallback ultime). Ex. "sac-de-couchage" → "Sac de couchage". */
export function capitalizeSlug(slug: string | null | undefined): string {
  const s = String(slug ?? "").trim();
  if (!s) return "";
  const spaced = s.replace(/-/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Résout le libellé d'affichage d'une CATÉGORIE — logique PURE (sync, testable).
 * Priorité : label DB (admin) → hardcodé de base (par locale) → slug capitalisé.
 * @param dbLabel label lu dans la table `categories`, ou null/undefined si absent/table vide.
 */
export function resolveCategoryLabel(
  slug: string | null | undefined,
  locale: Locale,
  dbLabel?: string | null,
): string {
  const s = String(slug ?? "").trim();
  if (!s) return "";
  if (dbLabel && dbLabel.trim()) return dbLabel.trim();          // 1. DB (admin)
  const base = BASE_CATEGORY_LABELS[s];                          // 2. hardcodé de base
  if (base) return locale === "en" ? base.en : base.fr;
  return capitalizeSlug(s);                                      // 3. slug capitalisé
}

/**
 * Résout le libellé d'affichage d'une SOUS-CATÉGORIE — logique PURE (sync, testable).
 * Aucun hardcodé de base (les sous-catégories démarrent VIDES, créées par l'admin) :
 * priorité label DB (table subcategories) → slug capitalisé.
 */
export function resolveSubcategoryLabel(
  subSlug: string | null | undefined,
  _locale: Locale,
  dbLabel?: string | null,
): string {
  const s = String(subSlug ?? "").trim();
  if (!s) return "";
  if (dbLabel && dbLabel.trim()) return dbLabel.trim();
  return capitalizeSlug(s);
}
