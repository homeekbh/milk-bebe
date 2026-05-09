import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
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
  ];
}