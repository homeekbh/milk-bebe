import { supabaseServer } from "@/lib/server/supabase";
import type { Metadata } from "next";
import ProduitsGrid from "@/app/produits/ProduitsGrid";

// ISR : page catalogue SEO (landing organique) servie depuis le cache CDN et
// régénérée toutes les 2 min. Le stock est de toute façon revalidé serveur au
// checkout, donc 120s de fraîcheur sur la liste est sans risque.
export const revalidate = 120;

export const metadata: Metadata = {
  title: "Tous les produits — Bodies, Pyjamas, Gigoteuses | M!LK",
  description: "Découvrez toute la collection M!LK : bodies, pyjamas, gigoteuses et accessoires pour nourrissons 0-6 mois en bambou certifié OEKO-TEX.",
};

async function getProducts() {
  const { data } = await supabaseServer
    .from("products")
    .select("id, name, slug, price_ttc, promo_price, promo_start, promo_end, stock, category_slug, image_url, description, featured, published, label, position, sizes, sizes_stock, colors")
    .eq("published", true)
    .order("position", { ascending: true });
  return data ?? [];
}

export default async function ProduitsPage() {
  const products = await getProducts();
  return (
    <ProduitsGrid
      products={products}
      title="Notre collection"
      subtitle="Vêtements nourrisson en bambou certifié OEKO-TEX"
    />
  );
}