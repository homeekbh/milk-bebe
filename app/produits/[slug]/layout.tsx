import type { Metadata } from "next";
import { supabaseServer } from "@/lib/server/supabase";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;

  const { data: product } = await supabaseServer
    .from("products")
    .select("name, description, seo_title, seo_description, image_url, slug")
    .eq("slug", slug)
    .single();

  if (!product) {
    return {
      title:       "Produit — M!LK",
      description: "Essentiels bébé bambou OEKO-TEX certifiés pour nourrissons 0-6 mois.",
    };
  }

  const title       = product.seo_title       ?? `${product.name} — M!LK | Bambou OEKO-TEX`;
  const description = product.seo_description ?? product.description ?? `${product.name} en bambou certifié OEKO-TEX Standard 100. Pour nourrissons 0-6 mois.`;
  const url         = `${BASE}/produits/${product.slug}`;

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
    openGraph: {
      title,
      description,
      url,
      type:   "website",
      images: product.image_url ? [{ url: product.image_url, width: 1200, height: 1600, alt: product.name }] : [],
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