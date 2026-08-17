import { supabaseServer } from "@/lib/server/supabase";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAlternates } from "@/i18n/seo";
import ProduitsGrid from "@/app/[locale]/produits/ProduitsGrid";
import { isPromoActive } from "@/lib/promo";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

// ISR : page catalogue SEO (landing organique) servie depuis le cache CDN et
// régénérée toutes les 2 min. Le stock est de toute façon revalidé serveur au
// checkout, donc 120s de fraîcheur sur la liste est sans risque.
export const revalidate = 120;

// generateMetadata dynamique : titles/desc localisés FR/EN + hreflang
// via getAlternates (même mécanisme www + x-default que le reste du site).
export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> }
): Promise<Metadata> {
  const { locale } = await params;
  const isFR = locale === "fr";
  const title = isFR
    ? "Vêtements bébé bambou OEKO-TEX — Pyjamas, Bodies, Gigoteuses, Turbulettes"
    : "Baby Bamboo Clothing OEKO-TEX — Pyjamas, Bodysuits, Sleep Bags";
  const description = isFR
    ? "Toute la collection en bambou certifié OEKO-TEX : des pièces douces et respirantes, du jour à la nuit, 0-6 mois. Livraison offerte dès 60€."
    : "The full M!LK range in OEKO-TEX certified bamboo: soft, breathable pieces for day and night, sized 0-6 months. Free delivery over €60.";
  return {
    title,
    description,
    alternates: getAlternates(locale, "/produits"),
    openGraph: {
      title,
      description,
      url: `${BASE}/${locale}/produits`,
      siteName: "M!LK",
      locale: isFR ? "fr_FR" : "en_GB",
      type: "website",
      images: [{ url: `${BASE}/images/og/milk-og-homepage.jpg`, width: 1200, height: 630 }],
    },
  };
}

async function getProducts() {
  const { data } = await supabaseServer
    .from("products")
    .select("id, name, slug, price_ttc, promo_price, promo_start, promo_end, stock, category_slug, subcategory_slug, image_url, description, description_en, featured, published, label, position, sizes, sizes_stock, colors")
    .eq("published", true)
    .order("position", { ascending: true });
  return data ?? [];
}

export default async function ProduitsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "catalog" });
  // Statut promo calculé CÔTÉ SERVEUR (une seule horloge) → transmis en prop, plus de divergence
  // d'hydratation sur les badges/prix de la grille (cf. lib/promo.ts).
  const products = (await getProducts()).map((p: any) => ({ ...p, __promo: isPromoActive(p) }));
  return (
    <ProduitsGrid
      products={products}
      title={t("collection_title")}
      subtitle={t("collection_subtitle")}
    />
  );
}