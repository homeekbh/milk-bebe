import { supabaseServer } from "@/lib/server/supabase";
import { NextResponse } from "next/server";

/**
 * GET /api/home/offers
 * Retourne les produits en promo active pour la section "Offres du moment"
 */
export async function GET() {
  try {
    const now = new Date().toISOString();

    const { data: products } = await supabaseServer
      .from("products")
      .select("id, name, slug, price_ttc, promo_price, promo_start, promo_end, stock, image_url, label, category_slug")
      .eq("published", true)
      .gt("stock", 0)
      .not("promo_price", "is", null)
      .lte("promo_start", now)
      .gte("promo_end", now)
      .order("promo_end", { ascending: true }) // les promos qui expirent bientôt en premier
      .limit(6);

    return NextResponse.json({ products: products ?? [] });
  } catch {
    return NextResponse.json({ products: [] });
  }
}