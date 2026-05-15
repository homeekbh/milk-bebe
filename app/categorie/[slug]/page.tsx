import { supabaseServer } from "@/lib/server/supabase";
import { notFound }       from "next/navigation";
import type { Metadata }  from "next";
import ProduitsGrid       from "@/app/produits/ProduitsGrid";

export const dynamic    = "force-dynamic";
export const revalidate = 0;

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

const CATEGORY_META: Record<string, { title: string; subtitle: string; seoTitle: string; seoDesc: string }> = {
  bodies: {
    title:    "Bodies nourrisson",
    subtitle: "L'essentiel du quotidien en bambou certifié OEKO-TEX — 0 à 6 mois",
    seoTitle: "Bodies nourrisson bambou OEKO-TEX | M!LK — 0 à 6 mois",
    seoDesc:  "Bodies nourrisson en bambou certifié OEKO-TEX. Ultra-doux, thermorégulateur, pressions sous la couche. Tailles Nouveau-né, 0-3 mois, 3-6 mois.",
  },
  pyjamas: {
    title:    "Pyjamas nourrisson",
    subtitle: "Pour des nuits sereines — bambou thermorégulateur certifié OEKO-TEX",
    seoTitle: "Pyjamas nourrisson bambou OEKO-TEX | M!LK — 0 à 6 mois",
    seoDesc:  "Pyjamas nourrisson en bambou certifié OEKO-TEX. Fermeture zip, thermorégulateur, ultra-doux pour peaux sensibles.",
  },
  gigoteuses: {
    title:    "Gigoteuses nourrisson",
    subtitle: "Sommeil sécurisé toute la nuit — bambou OEKO-TEX",
    seoTitle: "Gigoteuses nourrisson bambou OEKO-TEX | M!LK",
    seoDesc:  "Gigoteuses et turbulettes nourrisson en bambou certifié OEKO-TEX. Thermorégulateur, sécurisé, ultra-doux.",
  },
  accessoires: {
    title:    "Accessoires bébé",
    subtitle: "Les détails qui changent tout — bambou premium OEKO-TEX",
    seoTitle: "Accessoires bébé bambou OEKO-TEX | M!LK",
    seoDesc:  "Accessoires nourrisson en bambou certifié OEKO-TEX. Langes, bavoirs, bonnets et plus encore.",
  },
  langes: {
    title:    "Langes & Swaddles",
    subtitle: "L'emmaillotage qui calme bébé en quelques minutes — bambou OEKO-TEX",
    seoTitle: "Langes et swaddles bébé bambou OEKO-TEX | M!LK",
    seoDesc:  "Langes et swaddles nourrisson en bambou certifié OEKO-TEX. Grand format, thermorégulateur, multi-usage.",
  },
};

type Props = { params: Promise<{ slug: string }> };

function getMeta(slug: string) {
  if (CATEGORY_META[slug]) return CATEGORY_META[slug];
  const label = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");
  return {
    title:    label,
    subtitle: `Collection ${label} en bambou certifié OEKO-TEX — M!LK`,
    seoTitle: `${label} bébé bambou OEKO-TEX | M!LK`,
    seoDesc:  `${label} pour nourrisson en bambou certifié OEKO-TEX. Ultra-doux, thermorégulateur, adapté aux peaux sensibles.`,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const meta = getMeta(slug);
  const url  = `${BASE}/categorie/${slug}`;
  return {
    title:       meta.seoTitle,
    description: meta.seoDesc,
    alternates:  { canonical: url },
    openGraph: {
      title:       meta.seoTitle,
      description: meta.seoDesc,
      url,
      siteName:    "M!LK",
      locale:      "fr_FR",
      type:        "website",
      images: [{
        url:    `${BASE}/images/og/milk-og-homepage.jpg`,
        width:  1200,
        height: 630,
        alt:    meta.seoTitle,
      }],
    },
    twitter: {
      card:        "summary_large_image",
      title:       meta.seoTitle,
      description: meta.seoDesc,
      images:      [`${BASE}/images/og/milk-og-homepage.jpg`],
    },
  };
}

async function getAllProducts() {
  const { data } = await supabaseServer
    .from("products")
    .select("id, name, slug, price_ttc, promo_price, promo_start, promo_end, stock, category_slug, image_url, description, featured, published, label, position, sizes, sizes_stock, colors")
    .eq("published", true)
    .order("position", { ascending: true });
  return data ?? [];
}

export default async function CategoriePage({ params }: Props) {
  const { slug } = await params;

  // Charge tous les produits — ProduitsGrid gère le filtre par catégorie côté client
  const products = await getAllProducts();

  // 404 si aucun produit dans cette catégorie
  const hasCategory = products.some(p => p.category_slug === slug);
  if (!hasCategory) notFound();

  const meta = getMeta(slug);
  return (
    <ProduitsGrid
      products={products}
      title={meta.title}
      subtitle={meta.subtitle}
      defaultCategory={slug}
    />
  );
}