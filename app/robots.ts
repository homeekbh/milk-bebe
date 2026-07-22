import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // /api reste bloqué SAUF le flux Google Shopping : Merchant Center respecte robots.txt pour
        // la récupération du flux. Le chemin plus spécifique prime (Googlebot = longest-match).
        allow: ["/", "/api/feed/google-shopping"],
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
    // Directive Host (Yandex) : hostname NU attendu (sans protocole). Google l'ignore de toute façon.
    host:    BASE.replace(/^https?:\/\//, ""),
  };
}