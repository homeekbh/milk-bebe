import { supabaseServer } from "@/lib/server/supabase";
import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE,                                lastModified: new Date(), changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE}/produits`,                  lastModified: new Date(), changeFrequency: "daily",   priority: 0.9 },
    { url: `${BASE}/categorie/bodies`,          lastModified: new Date(), changeFrequency: "weekly",  priority: 0.8 },
    { url: `${BASE}/categorie/pyjamas`,         lastModified: new Date(), changeFrequency: "weekly",  priority: 0.8 },
    { url: `${BASE}/categorie/gigoteuses`,      lastModified: new Date(), changeFrequency: "weekly",  priority: 0.8 },
    { url: `${BASE}/categorie/accessoires`,     lastModified: new Date(), changeFrequency: "weekly",  priority: 0.7 },
    { url: `${BASE}/qui-sommes-nous`,           lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/pourquoi-bambou`,           lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/contact`,                   lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/livraison`,                 lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/cgv`,                       lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/mentions-legales`,          lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/politique-confidentialite`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/faq`,                       lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  ];

  try {
    const { data: products } = await supabaseServer
      .from("products")
      .select("slug, updated_at, category_slug")
      .eq("published", true)
      .gt("stock", 0);

    const productPages: MetadataRoute.Sitemap = (products ?? []).map(p => ({
      url:             `${BASE}/produits/${p.slug}`,
      lastModified:    p.updated_at ? new Date(p.updated_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority:        0.85,
    }));

    return [...staticPages, ...productPages];
  } catch {
    return staticPages;
  }
}