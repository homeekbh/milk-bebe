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
          // Routes publiques préfixées par la locale → motif "/*/route".
          "/*/checkout",
          "/*/success",
          "/*/panier",
          // /profil (/*/profil) : PAS dans le Disallow — il porte un <meta robots
          // noindex> (app/[locale]/profil/layout.tsx). Google doit pouvoir le
          // crawler pour voir le noindex et le DÉSINDEXER.
          "/*/favoris",
          "/*/connexion",
          "/*/inscription",
          "/*/coming-soon",
          "/*/recherche",
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host:    BASE,
  };
}