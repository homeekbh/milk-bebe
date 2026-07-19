import type { Metadata } from "next";
import { supabaseServer } from "@/lib/server/supabase";
import { JsonLd } from "@/components/seo/JsonLd";
import { getAlternates } from "@/i18n/seo";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

// ── Fallbacks SEO par catégorie ──────────────────────────────────────────────
// Utilisés UNIQUEMENT quand seo_title / seo_description sont NULL en DB.
// Objectif : capter les requêtes génériques (« pyjama bébé », « gigoteuse
// nourrisson », « turbulette »…) en plus des requêtes bambou.
const CATEGORY_TITLE_MAP: Record<string, (name: string) => string> = {
  pyjamas:     (n) => `${n} — Pyjama bébé bambou OEKO-TEX, grenouillère nourrisson 0-6 mois`,
  bodies:      (n) => `${n} — Body bébé bambou OEKO-TEX, body nourrisson doux 0-6 mois`,
  gigoteuses:  (n) => `${n} — Gigoteuse bébé bambou, turbulette nourrisson 0-3 mois`,
  langes:      (n) => `${n} — Lange bébé bambou OEKO-TEX, emmaillotage nourrisson`,
  bonnet:      (n) => `${n} — Bonnet bébé bambou OEKO-TEX, bonnet nourrisson doux`,
  accessoires: (n) => `${n} — Accessoire bébé bambou OEKO-TEX`,
};
const CATEGORY_DESC_MAP: Record<string, (name: string) => string> = {
  pyjamas:    (n) => `${n} en bambou certifié OEKO-TEX. Pyjama bébé ultra-doux, grenouillère nourrisson thermorégulante. Double zip + moufles intégrées. Livraison offerte dès 60€ en France métropolitaine.`,
  bodies:     (n) => `${n} en bambou certifié OEKO-TEX. Body bébé ultra-doux, body nourrisson hypoallergénique. Encolure enveloppe + moufles intégrées. Livraison offerte dès 60€ en France métropolitaine.`,
  gigoteuses: (n) => `${n} en bambou certifié OEKO-TEX. Gigoteuse bébé respirante, turbulette nourrisson 0-3 mois. À nouer, zéro bouton. Livraison offerte dès 60€ en France métropolitaine.`,
  langes:     (n) => `${n} en bambou certifié OEKO-TEX. Lange bébé 120×120 cm, emmaillotage nourrisson. Multi-usage. Livraison offerte dès 60€ en France métropolitaine.`,
  bonnet:     (n) => `${n} en bambou certifié OEKO-TEX. Bonnet bébé ultra-doux, bonnet nourrisson anatomique. Livraison offerte dès 60€ en France métropolitaine.`,
  accessoires:(n) => `${n} en bambou certifié OEKO-TEX. Accessoire bébé doux et hypoallergénique. Livraison offerte dès 60€ en France métropolitaine.`,
};
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  pyjamas:    ["pyjama bébé", "pyjama nourrisson", "grenouillère bébé", "pyjama bambou bébé", "pyjama bébé doux", "pyjama bébé OEKO-TEX", "pyjama bébé 0-3 mois", "pyjama bébé 0-6 mois"],
  bodies:     ["body bébé", "body nourrisson", "body bambou bébé", "body bébé doux", "body bébé peau sensible", "body bébé OEKO-TEX", "body bébé 0-3 mois"],
  gigoteuses: ["gigoteuse bébé", "turbulette bébé", "gigoteuse nourrisson", "turbulette nourrisson", "gigoteuse bambou", "gigoteuse 0-3 mois", "gigoteuse à nouer", "gigoteuse bébé respirante"],
  langes:     ["lange bébé", "lange emmaillotage", "lange bambou", "emmaillotage nourrisson", "lange bébé 120x120"],
  bonnet:     ["bonnet bébé", "bonnet nourrisson", "bonnet bébé bambou", "bonnet naissance"],
  accessoires:["accessoire bébé", "bandeau bébé", "accessoire nourrisson"],
};

// ── SSG + ISR ──────────────────────────────────────────────────────────────
// Pré-génère au build le shell + les métadonnées/JSON-LD SSR de CHAQUE produit
// publié, et les régénère toutes les heures (ISR). Le contenu visible reste
// hydraté côté client (page.tsx = "use client"), mais les signaux SEO réels
// (meta, OG, Product schema) sont servis depuis le cache statique.
export const revalidate = 900;

export async function generateStaticParams() {
  const { data } = await supabaseServer
    .from("products")
    .select("slug")
    .eq("published", true);
  return (data ?? []).map((p: { slug: string }) => ({ slug: p.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string; slug: string }> }
): Promise<Metadata> {
  const { locale, slug } = await params;

  const { data: product } = await supabaseServer
    .from("products")
    .select("name, description, seo_title, seo_description, image_url, slug, category_slug")
    .eq("slug", slug)
    .single();

  if (!product) {
    return {
      title:       "Produit",
      description: "Essentiels bébé bambou OEKO-TEX certifiés pour nourrissons 0-6 mois.",
    };
  }

  // Fallback enrichi par catégorie (uniquement pour les produits SANS seo_title
  // custom en DB) : injecte les termes génériques recherchés par les parents
  // (« pyjama bébé », « grenouillère », « turbulette »…) en plus du bambou.
  const catSlug = product.category_slug ?? "";
  const title = product.seo_title
    ?? CATEGORY_TITLE_MAP[catSlug]?.(product.name)
    ?? `${product.name} — bambou OEKO-TEX 0-6 mois`;

  const description = product.seo_description
    ?? CATEGORY_DESC_MAP[catSlug]?.(product.name)
    ?? `${product.name} en bambou certifié OEKO-TEX. Livraison offerte dès 60€ en France métropolitaine.`;

  const url = `${BASE}/${locale}/produits/${product.slug}`;

  // Mots-clés : génériques de la catégorie + signaux marque/matière.
  const keywords = [
    ...(CATEGORY_KEYWORDS[catSlug] ?? []),
    "bambou OEKO-TEX", "M!LK", "bébé 0-6 mois",
  ];

  // NB : le BreadcrumbList JSON-LD est désormais émis comme VRAI <script> via
  // getBreadcrumbLd()/<JsonLd> dans le layout (avant : `other:{script:breadcrumb}`
  // → rendu en <meta name="script:breadcrumb">, non reconnu par Google).
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
    alternates: getAlternates(locale, `/produits/${product.slug}`),
  };
}

// ── JSON-LD Product schema ─────────────────────────────────────────────────
async function getProductJsonLd(slug: string, locale: string) {
  const { data: product } = await supabaseServer
    .from("products")
    .select("id, name, slug, description, price_ttc, promo_price, promo_start, promo_end, stock, sizes_stock, category_slug, image_url, image_url_2, image_url_3, image_url_4, image_url_5, image_url_6, image_url_7, image_url_8")
    .eq("slug", slug)
    .single();
  if (!product) return null;

  // Extraction des champs (TS ne propage pas le narrowing dans les closures)
  const stock        = Number(product.stock ?? 0);
  const priceTtc     = Number(product.price_ttc);
  const promoPrice   = product.promo_price != null ? Number(product.promo_price) : null;
  const promoStart   = product.promo_start ? String(product.promo_start).slice(0, 10) : null;
  const promoEnd     = product.promo_end   ? String(product.promo_end).slice(0, 10)   : null;
  // InStock si le stock agrégé OU au moins une taille (sizes_stock) est > 0.
  const sizeStockVals = product.sizes_stock && typeof product.sizes_stock === "object"
    ? Object.values(product.sizes_stock as Record<string, unknown>).map((v) => Number(v) || 0)
    : [];
  const inStock      = stock > 0 || sizeStockVals.some((v) => v > 0);

  // Prix actif (promo si fenêtre valide, sinon prix normal)
  const todayStr = new Date().toISOString().slice(0, 10);
  const promoActive =
    promoPrice != null
    && (!promoStart || todayStr >= promoStart)
    && (!promoEnd   || todayStr <= promoEnd);
  const price = promoActive ? (promoPrice as number) : priceTtc;

  // Avis approuvés pour aggregateRating
  const { data: reviews } = await supabaseServer
    .from("reviews")
    .select("rating")
    .eq("product_id", product.id)
    .eq("approved", true);

  const aggregateRating = (reviews && reviews.length > 0) ? {
    "@type":      "AggregateRating",
    ratingValue:  (reviews.reduce((s, r) => s + Number(r.rating ?? 0), 0) / reviews.length).toFixed(1),
    reviewCount:  reviews.length,
    bestRating:   5,
    worstRating:  1,
  } : null;

  const url = `${BASE}/${locale}/produits/${product.slug}`;

  // Images : image principale + secondaires (image_url_2..8) non nulles.
  // (Avant : sélectionnait une colonne `images` INEXISTANTE → la requête
  //  échouait silencieusement → getProductJsonLd renvoyait null → AUCUN
  //  Product schema n'était émis. Bug pré-existant corrigé ici.)
  const imageList = [
    product.image_url,
    product.image_url_2, product.image_url_3, product.image_url_4, product.image_url_5,
    product.image_url_6, product.image_url_7, product.image_url_8,
  ].filter(Boolean);

  return {
    "@context":    "https://schema.org",
    "@type":       "Product",
    name:          product.name,
    description:   product.description ?? `${product.name} en bambou certifié OEKO-TEX. Cadeau naissance idéal, livraison France.`,
    image:         imageList,
    brand:         { "@type": "Brand", name: "M!LK" },
    material:      "Bambou certifié OEKO-TEX",
    sku:           product.slug,
    category:      product.category_slug ?? undefined,
    ...(aggregateRating ? { aggregateRating } : {}),
    offers: {
      "@type":         "Offer",
      price:           Number.isFinite(price) ? price.toFixed(2) : "0.00",
      priceCurrency:   "EUR",
      availability:    inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url,
      seller:          { "@type": "Organization", name: "M!LK" },
      priceValidUntil: "2027-12-31",
      itemCondition:   "https://schema.org/NewCondition",
      hasMerchantReturnPolicy: {
        "@type":               "MerchantReturnPolicy",
        applicableCountry:     "FR",
        returnPolicyCategory:  "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays:    15,
        returnMethod:          "https://schema.org/ReturnByMail",
        returnFees:            "https://schema.org/FreeReturn",
      },
      shippingDetails: {
        "@type":               "OfferShippingDetails",
        shippingRate:          { "@type": "MonetaryAmount", value: "3.50", currency: "EUR" },
        shippingDestination:   { "@type": "DefinedRegion", addressCountry: "FR" },
        deliveryTime: {
          "@type":      "ShippingDeliveryTime",
          handlingTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 2, unitCode: "DAY" },
          transitTime:  { "@type": "QuantitativeValue", minValue: 2, maxValue: 4, unitCode: "DAY" },
        },
      },
    },
  };
}

export default async function ProductSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params:   Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const productLd = await getProductJsonLd(slug, locale);

  // BreadcrumbList en VRAI JSON-LD (URLs locale-préfixées, cohérentes).
  const breadcrumbLd = productLd ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil",  item: `${BASE}/${locale}` },
      { "@type": "ListItem", position: 2, name: "Produits", item: `${BASE}/${locale}/produits` },
      { "@type": "ListItem", position: 3, name: (productLd as { name: string }).name, item: `${BASE}/${locale}/produits/${slug}` },
    ],
  } : null;

  return (
    <>
      {productLd && <JsonLd data={breadcrumbLd ? [productLd, breadcrumbLd] : productLd} />}
      {children}
    </>
  );
}