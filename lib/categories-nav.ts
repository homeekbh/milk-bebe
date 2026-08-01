// lib/categories-nav.ts — SOURCE UNIQUE de l'ordre des catégories de navigation (Lot 4).
//
// La LISTE des catégories reste DÉRIVÉE des produits publiés (décision lot 4 : jamais de
// catégorie vide, on ne lit PAS la table `categories` dans ce lot). Ce module ne fait
// qu'ORDONNER + dédupliquer des slugs. Les LIBELLÉS viennent de l'i18n (catalog.cat_*) et les
// ICÔNES du composant CategoryNav — ici, aucun libellé ni JSX (module pur, testable, server+client).
//
// C'est le remplaçant unique du CAT_ORDER dupliqué (ProduitsGrid) et de l'ordre implicite du
// tableau CATS du Header.

export const CATEGORY_ORDER: Record<string, number> = {
  bodies: 1, pyjamas: 2, gigoteuses: 3, accessoires: 4, langes: 5,
};

/** Dédup + tri par CATEGORY_ORDER (catégories inconnues rejetées en fin, ordre stable ensuite). */
export function orderCategorySlugs(slugs: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of slugs) {
    const slug = String(s ?? "").trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
  }
  return out.sort((a, b) => (CATEGORY_ORDER[a] ?? 99) - (CATEGORY_ORDER[b] ?? 99));
}
