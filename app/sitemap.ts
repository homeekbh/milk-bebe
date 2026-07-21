import { supabaseServer } from "@/lib/server/supabase";
import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

type Freq = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";

/**
 * Sitemap multilingue — chaque chemin est émis pour CHAQUE locale (/fr, /en)
 * avec les balises hreflang (alternates.languages). Exclus (via robots.ts) :
 * /admin, /api, /profil, /panier, /checkout, /favoris, /recherche, etc.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const locales = routing.locales;

  // Émet une entrée par locale pour un chemin donné (chemin SANS préfixe locale).
  const expand = (
    path: string,
    changeFrequency: Freq,
    priority: number,
    lastModified: Date = now,
  ): MetadataRoute.Sitemap => {
    const languages = Object.fromEntries(
      locales.map((l) => [l, `${BASE}/${l}${path}`]),
    );
    return locales.map((locale) => ({
      url: `${BASE}/${locale}${path}`,
      lastModified,
      changeFrequency,
      priority,
      alternates: { languages },
    }));
  };

  const staticPages: MetadataRoute.Sitemap = [
    ...expand("",                           "daily",   1.0),
    ...expand("/produits",                  "daily",   0.9),
    ...expand("/packs",                     "weekly",  0.7),
    ...expand("/blog",                      "weekly",  0.7),
    ...expand("/guide-des-tailles",         "monthly", 0.7),
    ...expand("/vetements-bebe-peau-sensible", "monthly", 0.7),
    ...expand("/qui-sommes-nous",           "monthly", 0.6),
    ...expand("/pourquoi-bambou",           "monthly", 0.6),
    ...expand("/faq",                       "monthly", 0.6),
    ...expand("/livraison",                 "monthly", 0.6),
    ...expand("/contact",                   "monthly", 0.5),
    ...expand("/avis-clients",              "weekly",  0.5),
    ...expand("/cgv",                       "yearly",  0.3),
    ...expand("/mentions-legales",          "yearly",  0.3),
    ...expand("/politique-confidentialite", "yearly",  0.3),
  ];

  // Produits actifs (published=true) + catégories dérivées. try/catch résilient.
  // ⚠️ La table products N'A PAS de colonne `updated_at` (seulement `created_at`) :
  // l'ancien select sur `updated_at` renvoyait data=null SILENCIEUSEMENT
  // (supabase-js ne throw pas) → 0 produit/catégorie dans le sitemap. Corrigé.
  let dynamicPages: MetadataRoute.Sitemap = [];

  try {
    const { data: products, error } = await supabaseServer
      .from("products")
      .select("slug, created_at, category_slug")
      .eq("published", true);
    if (error) throw error;

    const cats = new Set<string>();
    for (const p of products ?? []) {
      if (p.category_slug) cats.add(p.category_slug);
    }

    const categoryPages = [...cats].flatMap((slug) =>
      expand(`/categorie/${encodeURIComponent(slug)}`, "weekly", 0.8),
    );
    const productPages = (products ?? []).flatMap((p) =>
      expand(
        `/produits/${encodeURIComponent(p.slug)}`,
        "weekly",
        0.8,
        p.created_at ? new Date(p.created_at) : now,
      ),
    );
    dynamicPages = [...categoryPages, ...productPages];
  } catch {
    // fallback : pages statiques uniquement
  }

  // Articles de blog publiés — try/catch séparé : si la table blog_posts
  // n'existe pas encore (seed non exécuté), les produits restent dans le sitemap.
  let blogPages: MetadataRoute.Sitemap = [];
  try {
    const { data: posts } = await supabaseServer
      .from("blog_posts")
      .select("slug, updated_at, published_at")
      .eq("status", "published");

    blogPages = (posts ?? []).flatMap((p) =>
      expand(
        `/blog/${p.slug}`,
        "monthly",
        0.6,
        p.updated_at ? new Date(p.updated_at) : (p.published_at ? new Date(p.published_at) : now),
      ),
    );
  } catch {
    // table absente / erreur : pas d'articles dans le sitemap
  }

  // Coffrets (packs) actifs — try/catch séparé (résilience si la table manque).
  let packPages: MetadataRoute.Sitemap = [];
  try {
    const { data: packs } = await supabaseServer
      .from("packs")
      .select("slug")
      .eq("active", true);
    packPages = (packs ?? []).flatMap((p) =>
      expand(`/packs/${encodeURIComponent(p.slug)}`, "weekly", 0.7),
    );
  } catch {
    // table absente / erreur : pas de coffrets dans le sitemap
  }

  return [...staticPages, ...dynamicPages, ...blogPages, ...packPages];
}
