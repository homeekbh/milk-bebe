import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/checkout",
          "/success",
          "/panier",
          "/profil",
          "/connexion",
          "/inscription",
          "/coming-soon",
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host:    BASE,
  };
}