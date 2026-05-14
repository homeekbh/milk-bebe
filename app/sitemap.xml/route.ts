import { supabaseServer } from "@/lib/server/supabase";

export async function GET() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";
  const now  = new Date().toISOString().slice(0, 10);

  const staticPages = [
    { url: "/",                      priority: "1.0", changefreq: "weekly"  },
    { url: "/produits",              priority: "0.9", changefreq: "daily"   },
    { url: "/categorie/bodies",      priority: "0.8", changefreq: "weekly"  },
    { url: "/categorie/pyjamas",     priority: "0.8", changefreq: "weekly"  },
    { url: "/categorie/gigoteuses",  priority: "0.8", changefreq: "weekly"  },
    { url: "/categorie/accessoires", priority: "0.8", changefreq: "weekly"  },
    { url: "/qui-sommes-nous",       priority: "0.6", changefreq: "monthly" },
    { url: "/pourquoi-bambou",       priority: "0.7", changefreq: "monthly" },
    { url: "/livraison",             priority: "0.5", changefreq: "monthly" },
    { url: "/cgv",                   priority: "0.3", changefreq: "yearly"  },
    { url: "/mentions-legales",      priority: "0.3", changefreq: "yearly"  },
  ];

  // ✅ Tous les produits publiés — sans filtre stock pour indexer même les épuisés
  let productPages: { url: string; priority: string; changefreq: string; lastmod?: string }[] = [];
  try {
    const { data } = await supabaseServer
      .from("products")
      .select("slug, updated_at, published")
      .neq("published", false)
      .order("created_at", { ascending: false });

    productPages = (data ?? [])
      .filter(p => p.slug)
      .map(p => ({
        url:        `/produits/${p.slug}`,
        priority:   "0.85",
        changefreq: "weekly",
        lastmod:    p.updated_at ? p.updated_at.slice(0, 10) : now,
      }));
  } catch {
    // silencieux si Supabase indisponible
  }

  // ✅ Catégories dynamiques depuis Supabase
  let categoryPages: { url: string; priority: string; changefreq: string }[] = [];
  try {
    const { data } = await supabaseServer
      .from("categories")
      .select("slug");

    const staticCats = ["bodies", "pyjamas", "gigoteuses", "accessoires"];
    const dynamicCats = (data ?? [])
      .map((c: any) => c.slug)
      .filter((s: string) => s && !staticCats.includes(s));

    categoryPages = dynamicCats.map((slug: string) => ({
      url:        `/categorie/${slug}`,
      priority:   "0.8",
      changefreq: "weekly",
    }));
  } catch {}

  const allPages = [...staticPages, ...categoryPages, ...productPages];

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
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}