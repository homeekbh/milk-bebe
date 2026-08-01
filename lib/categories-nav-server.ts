// lib/categories-nav-server.ts — Dérive la liste des catégories de navigation depuis les
// PRODUITS PUBLIÉS (décision lot 4 : jamais de catégorie vide ; on ne lit PAS la table `categories`).
//
// Le Header consomme cette liste sur CHAQUE page → on met en cache (unstable_cache) pour ne pas
// requêter à chaque rendu : au plus une requête par fenêtre de revalidation, et les pages ISR/statique
// restent statiques (donnée traitée comme du cache, comme un fetch revalidé).

import { unstable_cache } from "next/cache";
import { supabaseServer } from "@/lib/server/supabase";
import { orderCategorySlugs } from "@/lib/categories-nav";

export const getNavCategorySlugs = unstable_cache(
  async (): Promise<string[]> => {
    const { data } = await supabaseServer
      .from("products")
      .select("category_slug")
      .eq("published", true);
    return orderCategorySlugs((data ?? []).map((r: any) => r.category_slug));
  },
  ["nav-category-slugs"],
  { revalidate: 300, tags: ["nav-categories"] },
);
