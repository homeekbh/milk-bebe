import { supabaseServer } from "@/lib/server/supabase";
import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

/**
 * Sitemap dynamique
 * - / : priority 1.0, daily
 * - /categorie/* (existantes en DB) : priority 0.9, weekly
 * - /produits/* (published, peu importe stock — out-of-stock garde SEO) : priority 0.8, weekly
 * - /qui-sommes-nous, /pourquoi-bambou, /faq, /livraison : 0.6, monthly
 * - /cgv, /mentions-legales, /politique-confidentialite : 0.3, yearly
 * Exclus : /admin, /api, /profil, /panier, /checkout, /favoris (via robots.ts)
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE,                                lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE}/produits`,                  lastModified: now, changeFrequency: "daily",   priority: 0.9 },
    { url: `${BASE}/qui-sommes-nous`,           lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/pourquoi-bambou`,           lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/faq`,                       lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/livraison`,                 lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/contact`,                   lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/cgv`,                       lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE}/mentions-legales`,          lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE}/politique-confidentialite`, lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
  ];

  let productPages:  MetadataRoute.Sitemap = [];
  let categoryPages: MetadataRoute.Sitemap = [];

  try {
    // Catégories : derived from existing products (pas de table dédiée)
    const { data: products } = await supabaseServer
      .from("products")
      .select("slug, updated_at, category_slug")
      .eq("published", true);

    const cats = new Set<string>();
    for (const p of products ?? []) {
      if (p.category_slug) cats.add(p.category_slug);
    }
    categoryPages = [...cats].map(slug => ({
      url:             `${BASE}/categorie/${slug}`,
      lastModified:    now,
      changeFrequency: "weekly" as const,
      priority:        0.9,
    }));

    productPages = (products ?? []).map(p => ({
      url:             `${BASE}/produits/${p.slug}`,
      lastModified:    p.updated_at ? new Date(p.updated_at) : now,
      changeFrequency: "weekly" as const,
      priority:        0.8,
    }));
  } catch {
    // fallback : pages statiques uniquement
  }

  return [...staticPages, ...categoryPages, ...productPages];
}