import { supabaseServer } from "@/lib/server/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const { data, error } = await supabaseServer
      .from("products").select("*").eq("id", id).single();
    if (error) return Response.json({ error: error.message }, { status: 404 });
    return Response.json(data);
  }

  const { data, error } = await supabaseServer
    .from("products").select("*").order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

export async function POST(req: Request) {
  const body = await req.json();

  const clean = {
    ...body,
    price_ttc:   isNaN(Number(body.price_ttc))   ? 0    : Number(body.price_ttc),
    promo_price: !body.promo_price || isNaN(Number(body.promo_price)) ? null : Number(body.promo_price),
    stock:       isNaN(Number(body.stock))        ? 0    : Number(body.stock),
    promo_start: body.promo_start || null,
    promo_end:   body.promo_end   || null,
  };

  const { data, error } = await supabaseServer
    .from("products").insert([clean]).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data);
}

export async function PUT(req: Request) {
  const { id, ...rest } = await req.json();
  if (!id) return Response.json({ error: "id manquant" }, { status: 400 });

  const clean = {
    ...rest,
    price_ttc:   isNaN(Number(rest.price_ttc))   ? 0    : Number(rest.price_ttc),
    promo_price: !rest.promo_price || isNaN(Number(rest.promo_price)) ? null : Number(rest.promo_price),
    stock:       isNaN(Number(rest.stock))        ? 0    : Number(rest.stock),
    promo_start: rest.promo_start || null,
    promo_end:   rest.promo_end   || null,
  };

  const { data, error } = await supabaseServer
    .from("products").update(clean).eq("id", id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data);
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  if (!id) return Response.json({ error: "id manquant" }, { status: 400 });

  // Récupérer les URLs photos avant suppression
  const { data: product } = await supabaseServer
    .from("products")
    .select("image_url, image_url_2, image_url_3, image_url_4")
    .eq("id", id).single();

  // Supprimer les photos du storage Supabase
  if (product) {
    const urls = [product.image_url, product.image_url_2, product.image_url_3, product.image_url_4]
      .filter(Boolean)
      .filter((url: string) => url.includes("supabase"))
      .map((url: string) => url.split("/product-images/")[1])
      .filter(Boolean);

    if (urls.length > 0) {
      await supabaseServer.storage.from("product-images").remove(urls);
    }
  }

  const { error } = await supabaseServer.from("products").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}