import type { Metadata } from "next";
import { supabaseServer } from "@/lib/server/supabase";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;

  const { data: product } = await supabaseServer
    .from("products")
    .select("name, description, seo_title, seo_description, image_url, slug, category_slug")
    .eq("slug", slug)
    .single();

  if (!product) {
    return {
      title:       "Produit — M!LK",
      description: "Essentiels bébé bambou OEKO-TEX certifiés pour nourrissons 0-6 mois.",
    };
  }

  const title = product.seo_title ?? `${product.name} en bambou OEKO-TEX`;

  // Description = premier paragraphe (jusqu'au premier saut de ligne, max 155 car)
  // + mention livraison offerte
  const firstParagraph = (product.description ?? "")
    .split(/\n\s*\n/)[0]?.trim()
    .replace(/\s+/g, " ")
    .slice(0, 130);
  const description = product.seo_description
    ?? (firstParagraph
        ? `${firstParagraph}… Livraison offerte dès 60€.`
        : `${product.name} en bambou certifié OEKO-TEX. Livraison offerte dès 60€.`);

  const url = `${BASE}/produits/${product.slug}`;

  // Mots-clés contextuels : catégorie + nom + qualité matière
  const cat = product.category_slug ?? "";
  const keywords = [
    product.name,
    `${product.name} bambou`,
    cat ? `${cat} bambou bébé` : "",
    cat ? `${cat} OEKO-TEX` : "",
    "bambou bébé OEKO-TEX",
    "cadeau naissance",
  ].filter(Boolean) as string[];

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil",     item: BASE },
      { "@type": "ListItem", position: 2, name: "Produits",    item: `${BASE}/produits` },
      { "@type": "ListItem", position: 3, name: product.name,  item: url },
    ],
  };

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      url,
      type:   "website",
      images: product.image_url ? [{ url: product.image_url, width: 1200, height: 630, alt: product.name }] : [],
    },
    twitter: {
      card:        "summary_large_image",
      title,
      description,
      images:      product.image_url ? [product.image_url] : [],
    },
    alternates: { canonical: url },
    other: {
      "script:breadcrumb": JSON.stringify(breadcrumbLd),
    },
  };
}

export default function ProductSlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}