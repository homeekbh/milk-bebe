import { supabaseServer } from "@/lib/server/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // select("*") (pas de colonne nommée) : si coffret_active n'existe pas encore
    // en base, on ne casse pas la requête (sinon products tombait en fallback).
    const { data: config } = await supabaseServer
      .from("homepage_config")
      .select("*")
      .eq("id", "main")
      .single();

    const coffretActive = Boolean((config as any)?.coffret_active);

    if (!config || !Array.isArray(config.product_ids) || config.product_ids.length === 0) {
      return NextResponse.json({ section_title: "Sélection du moment", products: [], coffret_active: coffretActive });
    }

    const { data: products } = await supabaseServer
      .from("products")
      .select("id, name, slug, price_ttc, promo_price, promo_start, promo_end, stock, image_url, label, category_slug")
      .in("id", config.product_ids)
      .gt("stock", 0);

    const ordered = config.product_ids
      .map((id: string) => (products ?? []).find((p: any) => p.id === id))
      .filter(Boolean);

    return NextResponse.json({
      section_title: config.section_title ?? "Sélection du moment",
      products: ordered,
      coffret_active: coffretActive,
    });
  } catch {
    return NextResponse.json({ section_title: "Sélection du moment", products: [] });
  }
}