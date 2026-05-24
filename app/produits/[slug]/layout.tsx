import type { Metadata } from "next";
import { supabaseServer } from "@/lib/server/supabase";
import { JsonLd } from "@/components/seo/JsonLd";

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

// ── JSON-LD Product schema ─────────────────────────────────────────────────
async function getProductJsonLd(slug: string) {
  const { data: product } = await supabaseServer
    .from("products")
    .select("id, name, slug, description, price_ttc, promo_price, promo_start, promo_end, stock, category_slug, image_url, images")
    .eq("slug", slug)
    .single();
  if (!product) return null;

  // Extraction des champs (TS ne propage pas le narrowing dans les closures)
  const stock        = Number(product.stock ?? 0);
  const priceTtc     = Number(product.price_ttc);
  const promoPrice   = product.promo_price != null ? Number(product.promo_price) : null;
  const promoStart   = product.promo_start ? String(product.promo_start).slice(0, 10) : null;
  const promoEnd     = product.promo_end   ? String(product.promo_end).slice(0, 10)   : null;
  const inStock      = stock > 0;

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

  const url = `${BASE}/produits/${product.slug}`;

  // Images : tableau s'il existe, sinon fallback image_url
  const imageList = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : (product.image_url ? [product.image_url] : []);

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
  params:   Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const productLd = await getProductJsonLd(slug);
  return (
    <>
      {productLd && <JsonLd data={productLd} />}
      {children}
    </>
  );
}