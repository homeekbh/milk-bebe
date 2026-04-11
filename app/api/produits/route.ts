import { supabaseServer } from "@/lib/server/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const slug     = searchParams.get("slug");

  // Lookup direct par slug — pour la page produit /produits/[slug]
  if (slug) {
    const { data, error } = await supabaseServer
      .from("products")
      .select("id, name, slug, price_ttc, promo_price, promo_start, promo_end, stock, category_slug, image_url, image_url_2, image_url_3, image_url_4, description, featured")
      .eq("slug", slug)
      .single();
    if (error || !data) return Response.json({ error: "Produit introuvable" }, { status: 404 });
    return Response.json(data);
  }

  let query = supabaseServer
    .from("products")
    .select("id, name, slug, price_ttc, promo_price, promo_start, promo_end, stock, category_slug, image_url, image_url_2, image_url_3, image_url_4, description, featured")
    .order("created_at", { ascending: false });

  if (category) query = query.eq("category_slug", category);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}