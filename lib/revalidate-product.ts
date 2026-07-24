import { revalidatePath } from "next/cache";
import { routing } from "@/i18n/routing";

// D1 : une sous-catégorie est aujourd'hui un LIBELLÉ de fil d'ariane NON cliquable — il n'existe
// AUCUNE page `/sous-categorie/<slug>` dédiée. Le libellé sous-cat vit dans la fiche (déjà
// revalidée). Passer à `true` le jour où une page sous-catégorie existe → zéro refonte ici.
// (Typé `boolean` explicite pour éviter la narrowing en littéral `false`.)
const SUBCATEGORY_PAGES_ENABLED: boolean = false;

/**
 * Revalidation CIBLÉE (on-demand) des pages publiques ISR touchées par une modif produit.
 * Cf. docs/plan-cache-revalidation.md.
 *
 * Pourquoi revalidatePath (et pas revalidateTag) : les données publiques sont lues via
 * supabase-js, HORS du cache fetch/tags de Next → seul revalidatePath (au niveau du segment de
 * route rendu) s'applique. On revalide des chemins CONCRETS par locale (`/fr/…`, `/en/…`) plutôt
 * que le motif `[locale]` → ciblage strict : uniquement le(s) slug(s) + catégorie(s) fournis.
 * L'ISR (fiche 900 s, liste/catégorie 120 s) reste le filet pour tout le reste.
 *
 * BEST-EFFORT : ne throw JAMAIS. Un échec de revalidation ne doit pas casser l'appelant
 * (webhook de paiement, sauvegarde admin). À n'appeler que depuis un Route Handler / Server Action.
 *
 * @param slug         slug courant du produit (fiche `/produits/<slug>`). Optionnel.
 * @param categorySlug catégorie(s) à revalider. Passer [ANCIENNE, NOUVELLE] lors d'un changement
 *                     de catégorie (sinon l'ancienne reste en 404, la nouvelle n'apparaît pas).
 *                     Accepte une string ou un tableau ; valeurs vides ignorées.
 * @param oldSlug         ancien slug en cas de renommage → revalide aussi l'ancienne URL de fiche.
 * @param subcategorySlug sous-catégorie(s) — [ANCIENNE, NOUVELLE] au changement. Structure
 *                        extensible : aucune page sous-cat dédiée aujourd'hui (D1) → la
 *                        revalidation sous-cat est neutralisée par SUBCATEGORY_PAGES_ENABLED. Le
 *                        libellé sous-cat de la fiche est déjà couvert par la revalidation fiche.
 */
export function revalidateProduct(
  slug?: string | null,
  categorySlug?: string | null | (string | null | undefined)[],
  oldSlug?: string | null,
  subcategorySlug?: string | null | (string | null | undefined)[],
): void {
  try {
    const slugs = [...new Set([slug, oldSlug].filter(Boolean) as string[])];
    const cats  = [...new Set(
      (Array.isArray(categorySlug) ? categorySlug : [categorySlug]).filter(Boolean) as string[],
    )];
    const subs  = [...new Set(
      (Array.isArray(subcategorySlug) ? subcategorySlug : [subcategorySlug]).filter(Boolean) as string[],
    )];

    for (const locale of routing.locales) {
      // Fiche(s) — chemin concret : régénère page + layout (JSON-LD) de cette URL.
      for (const s of slugs) revalidatePath(`/${locale}/produits/${s}`);
      // Liste catalogue.
      revalidatePath(`/${locale}/produits`);
      // Catégorie(s) — ancienne + nouvelle (dédupliquées).
      for (const c of cats) revalidatePath(`/${locale}/categorie/${c}`);
      // Sous-catégorie(s) — extension prête, inactive tant qu'aucune page dédiée n'existe (D1).
      if (SUBCATEGORY_PAGES_ENABLED) {
        for (const sc of subs) revalidatePath(`/${locale}/sous-categorie/${sc}`);
      }
    }
  } catch (e: any) {
    // Jamais bloquant.
    console.error("[revalidateProduct] échec best-effort:", e?.message ?? e);
  }
}
