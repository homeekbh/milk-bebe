import { supabaseServer } from "@/lib/server/supabase";
import { notFound }       from "next/navigation";
import type { Metadata }  from "next";
import ProduitsGrid       from "@/app/produits/ProduitsGrid";
import { JsonLd }         from "@/components/seo/JsonLd";
import { CategorySeoContent } from "@/components/seo/CategorySeoContent";
import { Breadcrumb }          from "@/components/seo/Breadcrumb";

// ISR : page catégorie SEO (landing organique). Cache CDN + régénération 2 min.
export const revalidate = 120;

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

const CATEGORY_META: Record<string, { title: string; subtitle: string; seoTitle: string; seoDesc: string; keywords: string[] }> = {
  bodies: {
    title:    "Bodies nourrisson",
    subtitle: "L'essentiel du quotidien en bambou certifié OEKO-TEX — 0 à 6 mois",
    seoTitle: "Body bébé bambou OEKO-TEX 0-6 mois",
    seoDesc:  "Bodies bébé en bambou certifié OEKO-TEX. Doux, respirants, anti-bactériens. Motifs modernes unisexes pour nouveau-né 0-6 mois.",
    keywords: ["body bébé bambou", "body OEKO-TEX", "body nouveau-né", "body bébé mixte", "body bambou certifié"],
  },
  pyjamas: {
    title:    "Pyjamas nourrisson",
    subtitle: "Pour des nuits sereines — bambou thermorégulateur certifié OEKO-TEX",
    seoTitle: "Pyjama bambou bébé 0-6 mois | Grenouillère dors-bien",
    seoDesc:  "Pyjamas grenouillères en bambou OEKO-TEX pour bébé 0-6 mois. 3× plus doux que le coton, thermorégulants, motifs modernes unisexes.",
    keywords: ["pyjama bambou bébé", "grenouillère bambou", "dors-bien bébé", "pyjama bébé nouveau-né", "grenouillère OEKO-TEX"],
  },
  gigoteuses: {
    title:    "Gigoteuses nourrisson",
    subtitle: "Sommeil sécurisé toute la nuit — bambou OEKO-TEX",
    seoTitle: "Gigoteuse bambou bébé 0-6 mois | Douce et thermorégulante",
    seoDesc:  "Gigoteuse à nouer en bambou certifié OEKO-TEX pour bébé 0-6 mois. Ultra-douce, thermorégulante, sommeil serein sans zip ni bouton. Livraison offerte dès 60€.",
    keywords: ["gigoteuse bambou", "gigoteuse bébé", "gigoteuse à nouer", "turbulette bambou", "sac de couchage bébé bambou", "gigoteuse OEKO-TEX"],
  },
  accessoires: {
    title:    "Accessoires bébé",
    subtitle: "Les détails qui changent tout — bambou premium OEKO-TEX",
    seoTitle: "Accessoires bébé bambou | Bonnets et nœuds tête",
    seoDesc:  "Bonnets et accessoires bébé en bambou OEKO-TEX. Doux sur la peau sensible des nouveau-nés. Motifs modernes unisexes.",
    keywords: ["bonnet bébé bambou", "accessoires bébé bambou", "nœud tête bébé", "bonnet nouveau-né"],
  },
  langes: {
    title:    "Langes & Swaddles",
    subtitle: "L'emmaillotage qui calme bébé en quelques minutes — bambou OEKO-TEX",
    seoTitle: "Lange bébé bambou | Mousseline OEKO-TEX",
    seoDesc:  "Langes et carrés de mousseline en bambou OEKO-TEX pour bébé. Ultra-absorbants, lavables, multifonctions. Livraison offerte dès 60€.",
    keywords: ["lange bambou bébé", "carré mousseline bébé", "lange OEKO-TEX", "mousseline bébé bambou"],
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
    keywords: [`${label.toLowerCase()} bébé bambou`, `${label.toLowerCase()} OEKO-TEX`],
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const meta = getMeta(slug);
  const url  = `${BASE}/categorie/${slug}`;
  return {
    title:       meta.seoTitle,
    description: meta.seoDesc,
    keywords:    meta.keywords,
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
  const url  = `${BASE}/categorie/${slug}`;

  // Produits de cette catégorie pour ItemList
  const inCat = products.filter(p => p.category_slug === slug);

  const collectionLd = {
    "@context":   "https://schema.org",
    "@type":      "CollectionPage",
    name:         meta.seoTitle,
    description:  meta.seoDesc,
    url,
    isPartOf:     { "@type": "WebSite", name: "M!LK", url: BASE },
    mainEntity: {
      "@type":           "ItemList",
      numberOfItems:     inCat.length,
      itemListElement:   inCat.slice(0, 30).map((p, i) => ({
        "@type":   "ListItem",
        position:  i + 1,
        url:       `${BASE}/produits/${p.slug}`,
        name:      p.name,
      })),
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type":    "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil",   item: BASE },
      { "@type": "ListItem", position: 2, name: "Produits",  item: `${BASE}/produits` },
      { "@type": "ListItem", position: 3, name: meta.title,  item: url },
    ],
  };

  return (
    <>
      <JsonLd data={[collectionLd, breadcrumbLd]} />
      <div style={{ background: "#ede8df" }}>
        <Breadcrumb
          variant="dark"
          items={[
            { label: "Accueil",  href: "/" },
            { label: "Produits", href: "/produits" },
            { label: meta.title },
          ]}
        />
      </div>
      <ProduitsGrid
        products={products}
        title={meta.title}
        subtitle={meta.subtitle}
        defaultCategory={slug}
      />
      <CategorySeoContent slug={slug} />
    </>
  );
}