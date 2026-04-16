import { supabaseServer } from "@/lib/server/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug     = searchParams.get("slug");
  const category = searchParams.get("category");

  // ✅ Récupération d'un produit par slug
  if (slug) {
    const { data, error } = await supabaseServer
      .from("products")
      .select("id, name, slug, price_ttc, promo_price, promo_start, promo_end, stock, category_slug, image_url, image_url_2, image_url_3, image_url_4, description, featured, published, label, position, sizes, sizes_stock, colors, main_image_index, weight_g, seo_title, seo_description")
      .eq("slug", slug)
      .eq("published", true)
      .single();
    if (error) return Response.json({ error: error.message }, { status: 404 });
    return Response.json(data);
  }

  // ✅ Liste produits — inclut toutes les colonnes nécessaires
  let query = supabaseServer
    .from("products")
    .select("id, name, slug, price_ttc, promo_price, promo_start, promo_end, stock, category_slug, image_url, image_url_2, image_url_3, image_url_4, description, featured, published, label, position, sizes, sizes_stock, colors, main_image_index")
    .eq("published", true)
    .order("position", { ascending: true });

  if (category) query = (query as any).eq("category_slug", category);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}