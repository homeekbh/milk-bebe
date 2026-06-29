import { supabaseServer } from "@/lib/server/supabase";
import { notFound }       from "next/navigation";
import type { Metadata }  from "next";
import { getAlternates }  from "@/i18n/seo";
import ProduitsGrid       from "@/app/[locale]/produits/ProduitsGrid";
import { JsonLd }         from "@/components/seo/JsonLd";
import { CategorySeoContent } from "@/components/seo/CategorySeoContent";
import { GigoteusesFaq }       from "@/components/seo/GigoteusesFaq";
import { Breadcrumb }          from "@/components/seo/Breadcrumb";
import ViewItemListTracker     from "@/components/analytics/ViewItemListTracker";

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

type Props = { params: Promise<{ locale: string; slug: string }> };

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

// ── SEO bilingue (titles/desc/keywords FR + EN) ──────────────────────────────
// Source dédiée aux balises <title>/<meta> servies par generateMetadata.
// Corrige le service de métadonnées FR sur /en + capte les requêtes génériques.
// (Le rendu visuel de la page — title/subtitle/H1, JSON-LD CollectionPage —
//  reste alimenté par getMeta() ci-dessus pour ne pas régresser l'affichage.)
const CATEGORY_SEO: Record<string, { fr: { seoTitle: string; seoDesc: string; keywords: string[]; h1: string }; en: { seoTitle: string; seoDesc: string; keywords: string[]; h1: string } }> = {
  bodies: {
    fr: {
      seoTitle: "Body bébé bambou OEKO-TEX — Body nourrisson ultra-doux 0-6 mois",
      seoDesc:  "Body bébé en bambou certifié OEKO-TEX. Ultra-doux, hypoallergénique, pour peaux sensibles. Encolure enveloppe + moufles intégrées. Livraison offerte dès 60€.",
      keywords: ["body bébé", "body nourrisson", "body bambou bébé", "body bébé peau sensible", "body bébé OEKO-TEX", "body bébé doux", "body naissance"],
      h1: "Bodies bébé bambou",
    },
    en: {
      seoTitle: "Baby Bodysuits OEKO-TEX Bamboo — Ultra-soft Newborn Bodysuits 0-6 months",
      seoDesc:  "OEKO-TEX certified bamboo baby bodysuits. Ultra-soft, hypoallergenic, for sensitive skin. Envelope neckline + built-in fold-over mittens. Free delivery from €60.",
      keywords: ["baby bodysuit", "newborn bodysuit", "bamboo bodysuit", "OEKO-TEX baby bodysuit"],
      h1: "Baby Bodysuits",
    },
  },
  pyjamas: {
    fr: {
      seoTitle: "Pyjama bébé bambou OEKO-TEX — Grenouillère nourrisson ultra-douce 0-6 mois",
      seoDesc:  "Pyjama bébé en bambou certifié OEKO-TEX. Grenouillère nourrisson ultra-douce, thermorégulante. Double zip inversé + moufles intégrées. Livraison offerte dès 60€.",
      keywords: ["pyjama bébé", "pyjama nourrisson", "grenouillère bébé", "grenouillère nourrisson", "pyjama bambou bébé", "pyjama bébé doux", "pyjama bébé OEKO-TEX", "pyjama bébé 0-3 mois", "turbulette pyjama"],
      h1: "Pyjamas bébé bambou",
    },
    en: {
      seoTitle: "Baby Pyjamas OEKO-TEX Bamboo — Ultra-soft Newborn Sleepsuits 0-6 months",
      seoDesc:  "OEKO-TEX certified bamboo baby pyjamas. Ultra-soft, temperature-regulating newborn sleepsuits. Double reverse zip + built-in mittens. Free delivery from €60.",
      keywords: ["baby pyjamas", "newborn sleepsuit", "bamboo baby pyjamas", "OEKO-TEX baby sleepsuit"],
      h1: "Baby Pyjamas",
    },
  },
  gigoteuses: {
    fr: {
      seoTitle: "Gigoteuse bébé bambou — Turbulette nourrisson 0-3 mois à nouer",
      seoDesc:  "Gigoteuse bébé en bambou certifié OEKO-TEX. Turbulette nourrisson respirante, à nouer. Zéro bouton, change facile la nuit. Livraison offerte dès 60€.",
      keywords: ["gigoteuse bébé", "turbulette bébé", "gigoteuse nourrisson", "turbulette nourrisson", "gigoteuse bambou", "gigoteuse 0-3 mois", "gigoteuse à nouer", "turbulette 0-3 mois", "gigoteuse bébé respirante", "gigoteuse sans bouton"],
      h1: "Gigoteuses bébé bambou",
    },
    en: {
      seoTitle: "Baby Sleep Bags OEKO-TEX Bamboo — Newborn Sleep Sack 0-3 months",
      seoDesc:  "OEKO-TEX certified bamboo baby sleep bags. Breathable newborn sleep sack, tie fastening. Zero snaps, easy night changes. Free delivery from €60.",
      keywords: ["baby sleep bag", "newborn sleep sack", "bamboo sleep bag", "baby sleeping bag 0-3 months"],
      h1: "Baby Sleep Bags",
    },
  },
  langes: {
    fr: {
      seoTitle: "Lange bébé bambou OEKO-TEX — Emmaillotage nourrisson 120x120 cm",
      seoDesc:  "Lange bébé en bambou certifié OEKO-TEX. 120×120 cm, multi-usage : emmaillotage, couverture, protection soleil. Livraison offerte dès 60€.",
      keywords: ["lange bébé", "lange emmaillotage", "lange bambou", "emmaillotage nourrisson", "lange bébé 120x120", "couverture emmaillotage"],
      h1: "Langes bébé bambou",
    },
    en: {
      seoTitle: "Baby Swaddle Blanket OEKO-TEX Bamboo — 120x120 cm Newborn Muslin",
      seoDesc:  "OEKO-TEX certified bamboo swaddle blanket. 120×120 cm, multi-use: swaddle, blanket, sun shade. Free delivery from €60.",
      keywords: ["baby swaddle", "newborn swaddle blanket", "bamboo muslin", "swaddle wrap"],
      h1: "Baby Swaddles",
    },
  },
  accessoires: {
    fr: {
      seoTitle: "Accessoires bébé bambou OEKO-TEX — Bonnets, Bandeaux nourrisson",
      seoDesc:  "Accessoires bébé en bambou certifié OEKO-TEX. Bonnets et bandeaux nourrisson ultra-doux. Livraison offerte dès 60€.",
      keywords: ["accessoire bébé", "bonnet bébé", "bandeau bébé", "accessoire nourrisson", "bonnet bambou bébé"],
      h1: "Accessoires bébé bambou",
    },
    en: {
      seoTitle: "Baby Accessories OEKO-TEX Bamboo — Hats, Headbands for Newborns",
      seoDesc:  "OEKO-TEX certified bamboo baby accessories. Ultra-soft newborn hats and headbands. Free delivery from €60.",
      keywords: ["baby hat", "newborn hat", "baby headband", "bamboo baby accessories"],
      h1: "Baby Accessories",
    },
  },
  bonnet: {
    fr: {
      seoTitle: "Bonnet bébé bambou OEKO-TEX — Bonnet nourrisson ultra-doux",
      seoDesc:  "Bonnet bébé en bambou certifié OEKO-TEX. Ultra-doux, anatomique, pour les premières heures. Livraison offerte dès 60€.",
      keywords: ["bonnet bébé", "bonnet nourrisson", "bonnet bambou bébé", "bonnet naissance", "bonnet bébé doux"],
      h1: "Bonnets bébé bambou",
    },
    en: {
      seoTitle: "Baby Hats OEKO-TEX Bamboo — Ultra-soft Newborn Beanie",
      seoDesc:  "OEKO-TEX certified bamboo baby hats. Ultra-soft, anatomical fit for the first hours. Free delivery from €60.",
      keywords: ["baby hat", "newborn beanie", "bamboo baby hat", "newborn hat"],
      h1: "Baby Hats",
    },
  },
};

function getCategoryMeta(slug: string, locale: string) {
  const cat  = CATEGORY_SEO[slug];
  const lang = (locale === "en" ? "en" : "fr") as "fr" | "en";
  if (cat) return cat[lang];
  return {
    seoTitle: locale === "en" ? "Baby Collection" : "Collection bébé",
    seoDesc:  locale === "en" ? "Baby essentials in OEKO-TEX certified bamboo." : "Essentiels bébé en bambou certifié OEKO-TEX.",
    keywords: ["bébé bambou", "OEKO-TEX"],
    h1:       slug,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const seo = getCategoryMeta(slug, locale);
  const url = `${BASE}/${locale}/categorie/${slug}`;
  return {
    title:       seo.seoTitle,
    description: seo.seoDesc,
    keywords:    seo.keywords,
    alternates:  getAlternates(locale, `/categorie/${slug}`),
    openGraph: {
      title:       seo.seoTitle,
      description: seo.seoDesc,
      url,
      siteName:    "M!LK",
      locale:      locale === "en" ? "en_GB" : "fr_FR",
      type:        "website",
      images: [{
        url:    `${BASE}/images/og/milk-og-homepage.jpg`,
        width:  1200,
        height: 630,
        alt:    seo.seoTitle,
      }],
    },
    twitter: {
      card:        "summary_large_image",
      title:       seo.seoTitle,
      description: seo.seoDesc,
      images:      [`${BASE}/images/og/milk-og-homepage.jpg`],
    },
  };
}

async function getAllProducts() {
  const { data } = await supabaseServer
    .from("products")
    .select("id, name, slug, price_ttc, promo_price, promo_start, promo_end, stock, category_slug, image_url, description, description_en, featured, published, label, position, sizes, sizes_stock, colors")
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
      <ViewItemListTracker
        listName={meta.title}
        items={inCat.map(p => ({
          id:       String(p.id),
          name:     p.name,
          price:    p.promo_price || p.price_ttc || 0,
          category: slug,
          slug:     p.slug,
        }))}
      />
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
      {slug === "gigoteuses" && <GigoteusesFaq />}
    </>
  );
}