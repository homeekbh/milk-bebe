import { supabaseServer } from "@/lib/server/supabase";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ProduitsGrid from "@/app/produits/ProduitsGrid";

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
};

const VALID_SLUGS = Object.keys(CATEGORY_META);
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const meta = CATEGORY_META[slug];
  if (!meta) return { title: "Catégorie introuvable | M!LK" };
  return { title: meta.seoTitle, description: meta.seoDesc };
}

async function getProductsByCategory(slug: string) {
  const { data } = await supabaseServer
    .from("products")
    .select("id, name, slug, price_ttc, promo_price, promo_start, promo_end, stock, category_slug, image_url, description, featured, published, label, position, sizes, sizes_stock, colors")
    .eq("category_slug", slug)
    .eq("published", true)
    .order("position", { ascending: true });
  return data ?? [];
}

export default async function CategoriePage({ params }: Props) {
  const { slug } = await params;
  if (!VALID_SLUGS.includes(slug)) notFound();
  const products = await getProductsByCategory(slug);
  const meta     = CATEGORY_META[slug];
  return <ProduitsGrid products={products} title={meta.title} subtitle={meta.subtitle} defaultCategory={slug} />;
}