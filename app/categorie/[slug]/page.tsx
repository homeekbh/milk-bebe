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
    seoTitle: "Body Bébé & Body Naissance | M!LK — Bambou OEKO-TEX 0-6 mois",
    seoDesc:  "Body bébé manches longues, body naissance sans étiquette. Cadeau naissance idéal. Bambou certifié OEKO-TEX, 3× plus doux que le coton. Body 0-3 mois et 3-6 mois livraison France.",
  },
  pyjamas: {
    title:    "Pyjamas nourrisson",
    subtitle: "Pour des nuits sereines — bambou thermorégulateur certifié OEKO-TEX",
    seoTitle: "Pyjama Bébé & Grenouillère Naissance | M!LK — Bambou OEKO-TEX",
    seoDesc:  "Pyjama bébé double zip, grenouillère avec moufles intégrées. Cadeau naissance original. Bambou OEKO-TEX ultra-doux. Pyjama naissance, 0-3 mois, 3-6 mois.",
  },
  gigoteuses: {
    title:    "Gigoteuses nourrisson",
    subtitle: "Sommeil sécurisé toute la nuit — bambou OEKO-TEX",
    seoTitle: "Gigoteuse Bébé & Turbulette Naissance | M!LK — Bambou OEKO-TEX",
    seoDesc:  "Gigoteuse bébé bambou OEKO-TEX. Turbulette naissance thermorégulation naturelle. Idée cadeau naissance utile. Gigoteuse 0-6 mois livraison France.",
  },
  accessoires: {
    title:    "Accessoires bébé",
    subtitle: "Les détails qui changent tout — bambou premium OEKO-TEX",
    seoTitle: "Accessoires Naissance & Bonnet Bébé | M!LK — Cadeau Naissance Original",
    seoDesc:  "Bonnet naissance, nœud tête bébé, bandeau bébé bambou OEKO-TEX. Cadeau naissance original et tendance. Idée cadeau jeune maman livraison France.",
  },
  langes: {
    title:    "Langes & Swaddles",
    subtitle: "L'emmaillotage qui calme bébé en quelques minutes — bambou OEKO-TEX",
    seoTitle: "Lange Bébé & Emmaillotage | M!LK — Bambou OEKO-TEX",
    seoDesc:  "Lange emmaillotage bambou OEKO-TEX ultra-doux. Lange bébé multiusage. Cadeau naissance pratique et naturel. Emmaillotage naissance 0-6 mois.",
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