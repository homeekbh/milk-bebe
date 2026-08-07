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
import CategoryNav             from "@/components/category/CategoryNav";

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
    seoTitle: "Gigoteuse & turbulette bébé bambou 0-6 mois",
    seoDesc:  "Gigoteuse bébé en bambou OEKO-TEX, douce et thermorégulante. Turbulette évolutive à nouer, s'ajuste à la croissance de bébé. Naissance à 6 mois.",
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
    seoDesc:  "Langes et carrés de mousseline en bambou OEKO-TEX pour bébé. Ultra-absorbants, lavables, multifonctions. Livraison offerte dès 60€ en France métropolitaine.",
    keywords: ["lange bambou bébé", "carré mousseline bébé", "lange OEKO-TEX", "mousseline bébé bambou"],
  },
};

// Sous-titres localisés (le H1 EN vit déjà dans CATEGORY_SEO ; le sous-titre, non).
const CATEGORY_SUBTITLE: Record<string, { fr: string; en: string }> = {
  bodies:      { fr: "L'essentiel du quotidien en bambou certifié OEKO-TEX — 0 à 6 mois", en: "Everyday essentials in OEKO-TEX certified bamboo — 0 to 6 months" },
  pyjamas:     { fr: "Pour des nuits sereines — bambou thermorégulateur certifié OEKO-TEX", en: "For peaceful nights — temperature-regulating OEKO-TEX bamboo" },
  gigoteuses:  { fr: "Sommeil sécurisé toute la nuit — bambou OEKO-TEX", en: "Safe sleep all night long — OEKO-TEX certified bamboo" },
  accessoires: { fr: "Les détails qui changent tout — bambou premium OEKO-TEX", en: "The little details that make all the difference — premium OEKO-TEX bamboo" },
  langes:      { fr: "L'emmaillotage qui calme bébé en quelques minutes — bambou OEKO-TEX", en: "Swaddling that soothes baby in minutes — OEKO-TEX bamboo" },
};
function getCategorySubtitle(slug: string, locale: string): string {
  const s = CATEGORY_SUBTITLE[slug];
  if (s) return locale === "en" ? s.en : s.fr;
  return locale === "en" ? "Baby essentials in OEKO-TEX certified bamboo." : "Essentiels bébé en bambou certifié OEKO-TEX.";
}

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
      seoDesc:  "En bambou certifié OEKO-TEX, doux pour les peaux sensibles. Encolure enveloppe et moufles intégrées, faciles à enfiler. Livraison offerte dès 60€.",
      keywords: ["body bébé", "body nourrisson", "body bambou bébé", "body bébé peau sensible", "body bébé OEKO-TEX", "body bébé doux", "body naissance"],
      h1: "Bodies bébé bambou",
    },
    en: {
      seoTitle: "Baby Bodysuits OEKO-TEX Bamboo — Ultra-soft Newborn Bodysuits 0-6 months",
      seoDesc:  "OEKO-TEX certified bamboo, gentle on sensitive skin. Envelope neckline and fold-over mittens, easy to slip on. Free delivery over €60.",
      keywords: ["baby bodysuit", "newborn bodysuit", "bamboo bodysuit", "OEKO-TEX baby bodysuit"],
      h1: "Baby Bodysuits",
    },
  },
  pyjamas: {
    fr: {
      seoTitle: "Pyjama bébé bambou OEKO-TEX — Grenouillère nourrisson ultra-douce 0-6 mois",
      seoDesc:  "En bambou certifié OEKO-TEX, thermorégulant pour des nuits sereines. Double zip inversé pour changer sans réveiller bébé. Livraison offerte dès 60€.",
      keywords: ["pyjama bébé", "pyjama nourrisson", "grenouillère bébé", "grenouillère nourrisson", "pyjama bambou bébé", "pyjama bébé doux", "pyjama bébé OEKO-TEX", "pyjama bébé 0-3 mois", "turbulette pyjama"],
      h1: "Pyjamas bébé bambou",
    },
    en: {
      seoTitle: "Baby Pyjamas OEKO-TEX Bamboo — Ultra-soft Newborn Sleepsuits 0-6 months",
      seoDesc:  "OEKO-TEX certified bamboo that regulates temperature for calmer nights. Double reverse zip for changes without waking baby. Free delivery over €60.",
      keywords: ["baby pyjamas", "newborn sleepsuit", "bamboo baby pyjamas", "OEKO-TEX baby sleepsuit"],
      h1: "Baby Pyjamas",
    },
  },
  gigoteuses: {
    fr: {
      seoTitle: "Gigoteuse & turbulette bébé bambou 0-6 mois",
      seoDesc:  "Gigoteuse bébé en bambou OEKO-TEX, douce et thermorégulante. Turbulette évolutive à nouer, s'ajuste à la croissance de bébé. Naissance à 6 mois.",
      keywords: ["gigoteuse bébé", "turbulette bébé", "gigoteuse nourrisson", "turbulette nourrisson", "gigoteuse bambou", "gigoteuse 0-3 mois", "gigoteuse à nouer", "turbulette 0-3 mois", "gigoteuse bébé respirante", "gigoteuse sans bouton"],
      h1: "Gigoteuses & turbulettes bébé en bambou",
    },
    en: {
      seoTitle: "Baby Sleep Bags OEKO-TEX Bamboo — Newborn Sleep Sack 0-3 months",
      seoDesc:  "OEKO-TEX certified bamboo baby sleep bags. Breathable newborn sleep sack, tie fastening. Zero snaps, easy night changes. Free delivery from €60.",
      keywords: ["baby sleep bag", "newborn sleep sack", "bamboo sleep bag", "baby sleeping bag 0-3 months"],
      h1: "Tie-Up Baby Sleep Bags",
    },
  },
  langes: {
    fr: {
      seoTitle: "Lange bébé bambou OEKO-TEX — Emmaillotage nourrisson 120x120 cm",
      seoDesc:  "En bambou certifié OEKO-TEX, 120×120 cm. Emmaillotage, couverture, protection soleil : un lange, mille usages. Livraison offerte dès 60€.",
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
      seoDesc:  "Bonnets et bandeaux en bambou certifié OEKO-TEX, doux sur la tête des nouveau-nés. La touche qui finit la tenue. Livraison offerte dès 60€.",
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
    .select("id, name, slug, price_ttc, promo_price, promo_start, promo_end, stock, category_slug, subcategory_slug, image_url, description, description_en, featured, published, label, position, sizes, sizes_stock, colors")
    .eq("published", true)
    .order("position", { ascending: true });
  return data ?? [];
}

export default async function CategoriePage({ params }: Props) {
  const { slug, locale } = await params;

  // Charge tous les produits — ProduitsGrid gère le filtre par catégorie côté client
  const products = await getAllProducts();

  // 404 si aucun produit dans cette catégorie
  const hasCategory = products.some(p => p.category_slug === slug);
  if (!hasCategory) notFound();

  const meta = getMeta(slug);
  // Affichage LOCALISÉ (H1 + sous-titre + fil d'ariane) : évite le rendu FR sur /en (le H1 EN
  // existe déjà dans CATEGORY_SEO ; sous-titre via CATEGORY_SUBTITLE).
  const catH1         = getCategoryMeta(slug, locale).h1;
  const catSub        = getCategorySubtitle(slug, locale);
  const homeLabel     = locale === "en" ? "Home" : "Accueil";
  const productsLabel = locale === "en" ? "Products" : "Produits";
  const url  = `${BASE}/${locale}/categorie/${slug}`;

  // Produits de cette catégorie pour ItemList
  const inCat = products.filter(p => p.category_slug === slug);

  const collectionLd = {
    "@context":   "https://schema.org",
    "@type":      "CollectionPage",
    name:         meta.seoTitle,
    description:  meta.seoDesc,
    url,
    isPartOf:     { "@type": "WebSite", name: "M!LK", url: `${BASE}/${locale}` },
    mainEntity: {
      "@type":           "ItemList",
      numberOfItems:     inCat.length,
      itemListElement:   inCat.slice(0, 30).map((p, i) => ({
        "@type":   "ListItem",
        position:  i + 1,
        url:       `${BASE}/${locale}/produits/${p.slug}`,
        name:      p.name,
      })),
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type":    "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: homeLabel,     item: `${BASE}/${locale}` },
      { "@type": "ListItem", position: 2, name: productsLabel, item: `${BASE}/${locale}/produits` },
      { "@type": "ListItem", position: 3, name: catH1,         item: url },
    ],
  };

  // ── A2 — aggregateRating par produit (UNIQUEMENT avis approuvés réels) ──────
  // Nœuds Product additionnels pour les produits de la catégorie qui ont au
  // moins 1 avis approuvé. Règle stricte : 0 avis ⇒ aucun nœud (jamais de
  // rating fictif). Prix/availability répliquent la logique de la fiche.
  let ratingNodes: object[] = [];
  try {
    const ids = inCat.map(p => p.id);
    if (ids.length) {
      const { data: rv } = await supabaseServer
        .from("reviews")
        .select("product_id, rating")
        .eq("approved", true)
        .in("product_id", ids);

      const byProd = new Map<string, number[]>();
      for (const r of rv ?? []) {
        const arr = byProd.get(r.product_id) ?? [];
        arr.push(Number(r.rating ?? 0));
        byProd.set(r.product_id, arr);
      }

      const todayStr = new Date().toISOString().slice(0, 10);
      ratingNodes = inCat.flatMap((p) => {
        const ratings = byProd.get(p.id);
        if (!ratings || ratings.length === 0) return [];
        const avg = (ratings.reduce((s, x) => s + x, 0) / ratings.length).toFixed(1);

        const promo = p.promo_price != null ? Number(p.promo_price) : null;
        const ps = p.promo_start ? String(p.promo_start).slice(0, 10) : null;
        const pe = p.promo_end ? String(p.promo_end).slice(0, 10) : null;
        const promoActive = promo != null && (!ps || todayStr >= ps) && (!pe || todayStr <= pe);
        const price = promoActive ? (promo as number) : Number(p.price_ttc);
        const sizeVals = p.sizes_stock && typeof p.sizes_stock === "object"
          ? Object.values(p.sizes_stock as Record<string, unknown>).map((v) => Number(v) || 0)
          : [];
        const inStock = Number(p.stock ?? 0) > 0 || sizeVals.some((v) => v > 0);
        const pUrl = `${BASE}/${locale}/produits/${p.slug}`;

        return [{
          "@context": "https://schema.org",
          "@type":    "Product",
          name:       p.name,
          url:        pUrl,
          ...(p.image_url ? { image: [p.image_url] } : {}),
          brand:      { "@type": "Brand", name: "M!LK" },
          sku:        p.slug,
          aggregateRating: {
            "@type":     "AggregateRating",
            ratingValue: avg,
            reviewCount: ratings.length,
            bestRating:  5,
            worstRating: 1,
          },
          offers: {
            "@type":        "Offer",
            price:          Number.isFinite(price) ? price.toFixed(2) : "0.00",
            priceCurrency:  "EUR",
            availability:   inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url:            pUrl,
          },
        }];
      });
    }
  } catch {
    ratingNodes = [];
  }

  return (
    <>
      <JsonLd data={[collectionLd, breadcrumbLd, ...ratingNodes]} />
      <ViewItemListTracker
        listName={catH1}
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
            { label: homeLabel,     href: "/" },
            { label: productsLabel, href: "/produits" },
            { label: catH1 },
          ]}
        />
      </div>
      <ProduitsGrid
        products={products}
        title={catH1}
        subtitle={catSub}
        defaultCategory={slug}
        categoryNav={
          <CategoryNav
            variant="row"
            tone="light"
            slugs={products.map(p => p.category_slug ?? "")}
            currentSlug={slug}
            showAll
          />
        }
      />
      <CategorySeoContent slug={slug} locale={locale} />
      {slug === "gigoteuses" && <GigoteusesFaq locale={locale} />}
    </>
  );
}