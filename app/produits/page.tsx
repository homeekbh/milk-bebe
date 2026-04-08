import { supabaseServer } from "@/lib/server/supabase";
import type { Metadata } from "next";
import ProduitsGrid from "@/app/produits/ProduitsGrid";

export const metadata: Metadata = {
  title: "Tous les produits — Bodies, Pyjamas, Gigoteuses | M!LK",
  description: "Découvrez toute la collection M!LK : bodies, pyjamas, gigoteuses et accessoires pour nourrissons 0-6 mois en bambou certifié OEKO-TEX.",
};

async function getProducts() {
  const { data } = await supabaseServer
    .from("products")
    .select("id, name, slug, price_ttc, promo_price, promo_start, promo_end, stock, category_slug, image_url, description, featured")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export default async function ProduitsPage() {
  const products = await getProducts();
  return <ProduitsGrid products={products} title="Notre collection" subtitle="Vêtements nourrisson en bambou certifié OEKO-TEX" />;
}