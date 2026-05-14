export async function GET() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";
  const now  = new Date().toISOString().slice(0, 10);

  const SUPABASE_URL = "https://ntkqmnenczltlwplswka.supabase.co";
  const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

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

  // Produits depuis Supabase REST API
  let productPages: { url: string; priority: string; changefreq: string; lastmod?: string }[] = [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/products?select=slug,updated_at&published=eq.true&order=created_at.desc`,
      {
        headers: {
          "apikey":        SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type":  "application/json",
        },
        cache: "no-store",
      }
    );
    if (res.ok) {
      const data = await res.json();
      productPages = (Array.isArray(data) ? data : [])
        .filter((p: any) => p.slug)
        .map((p: any) => ({
          url:        `/produits/${p.slug}`,
          priority:   "0.85",
          changefreq: "weekly",
          lastmod:    p.updated_at ? p.updated_at.slice(0, 10) : now,
        }));
    }
  } catch (e) {
    console.error("Sitemap products error:", e);
  }

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
      "Cache-Control": "no-store",
    },
  });
}