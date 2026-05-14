export async function GET() {
  const base = "https://www.milkbebe.fr";
  const now  = new Date().toISOString().slice(0, 10);

  const staticPages = [
    { url: "/",                      priority: "1.0", changefreq: "weekly"  },
    { url: "/produits",              priority: "0.9", changefreq: "daily"   },
    { url: "/categorie/bodies",      priority: "0.8", changefreq: "weekly"  },
    { url: "/categorie/pyjamas",     priority: "0.8", changefreq: "weekly"  },
    { url: "/categorie/gigoteuses",  priority: "0.8", changefreq: "weekly"  },
    { url: "/categorie/accessoires", priority: "0.8", changefreq: "weekly"  },
    { url: "/categorie/langes",      priority: "0.8", changefreq: "weekly"  },
    { url: "/categorie/bonnet",      priority: "0.8", changefreq: "weekly"  },
    { url: "/qui-sommes-nous",       priority: "0.6", changefreq: "monthly" },
    { url: "/pourquoi-bambou",       priority: "0.7", changefreq: "monthly" },
    { url: "/livraison",             priority: "0.5", changefreq: "monthly" },
    { url: "/cgv",                   priority: "0.3", changefreq: "yearly"  },
    { url: "/mentions-legales",      priority: "0.3", changefreq: "yearly"  },
  ];

  // ── Produits M!LK — à mettre à jour quand tu ajoutes un nouveau produit ──
  const productSlugs = [
    "body-bambou-damier",
    "body-bambou-smileys",
    "body-bambou-eclair",
    "pyjama-bambou-damier",
    "pyjama-bambou-smileys",
    "pyjama-bambou-eclair",
    "gigoteuse-damier",
    "gigoteuse-smileys",
    "gigoteuse-eclair",
    "lange-bambou-terracotta",
    "bonnet-bambou-terracotta",
    "bandeau-noeud-terracotta",
  ];

  const productPages = productSlugs.map(slug => ({
    url:        `/produits/${slug}`,
    priority:   "0.85",
    changefreq: "weekly",
    lastmod:    now,
  }));

  const allPages = [...staticPages, ...productPages];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${allPages.map(p => `  <url>
    <loc>${base}${p.url}</loc>
    <lastmod>${(p as any).lastmod ?? now}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type":  "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}