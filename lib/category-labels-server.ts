// lib/category-labels-server.ts — Lectures DB des libellés (table categories / subcategories).
// Réutilise les résolveurs PURS de lib/category-labels.ts. DÉFENSIF : tables vides ou absentes
// → maps {} → les résolveurs retombent sur le hardcodé/slug. Ne throw JAMAIS.
//
// Perf : pour résoudre PLUSIEURS libellés, charger la map UNE fois (fetchCategoryLabels) puis
// résoudre en pur (resolveCategoryLabel) — évite le N+1. Les getX() sont des convenances one-shot.

import { supabaseServer } from "@/lib/server/supabase";
import {
  resolveCategoryLabel,
  resolveSubcategoryLabel,
  type Locale,
} from "@/lib/category-labels";

/**
 * Map { category_slug → label } depuis la table `categories`. Table vide/absente/erreur → {}.
 */
export async function fetchCategoryLabels(): Promise<Record<string, string>> {
  try {
    const { data, error } = await supabaseServer.from("categories").select("slug, label");
    if (error || !Array.isArray(data)) return {};
    const map: Record<string, string> = {};
    for (const row of data) {
      if (row?.slug && row?.label) map[String(row.slug)] = String(row.label);
    }
    return map;
  } catch {
    return {};
  }
}

/**
 * Map { `${category_slug}/${slug}` → label } depuis `subcategories` (optionnellement filtrée par
 * catégorie). Table vide/absente/erreur → {}.
 */
export async function fetchSubcategoryLabels(categorySlug?: string | null): Promise<Record<string, string>> {
  try {
    let q = supabaseServer.from("subcategories").select("category_slug, slug, label");
    if (categorySlug) q = q.eq("category_slug", categorySlug);
    const { data, error } = await q;
    if (error || !Array.isArray(data)) return {};
    const map: Record<string, string> = {};
    for (const row of data) {
      if (row?.slug) map[`${row.category_slug ?? ""}/${row.slug}`] = String(row.label ?? "");
    }
    return map;
  } catch {
    return {};
  }
}

/** Convenance one-shot : libellé d'une catégorie (1 requête + résolution pure). */
export async function getCategoryLabel(slug: string | null | undefined, locale: Locale): Promise<string> {
  if (!slug) return "";
  const map = await fetchCategoryLabels();
  return resolveCategoryLabel(slug, locale, map[String(slug)]);
}

/** Convenance one-shot : libellé d'une sous-catégorie (1 requête + résolution pure). */
export async function getSubcategoryLabel(
  categorySlug: string | null | undefined,
  subSlug: string | null | undefined,
  locale: Locale,
): Promise<string> {
  if (!subSlug) return "";
  const map = await fetchSubcategoryLabels(categorySlug);
  return resolveSubcategoryLabel(subSlug, locale, map[`${categorySlug ?? ""}/${subSlug}`]);
}
