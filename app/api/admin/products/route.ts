import { supabaseServer } from "@/lib/server/supabase";

function isAuthorized(req: Request): boolean {
  const referer = req.headers.get("referer") ?? "";
  const origin  = req.headers.get("origin")  ?? "";
  const base    = process.env.NEXT_PUBLIC_BASE_URL ?? "";

  if (base && (referer.startsWith(base) || origin === base)) return true;
  if (referer.includes("localhost") || origin.includes("localhost")) return true;
  return false;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) return Response.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const { data, error } = await supabaseServer.from("products").select("*").eq("id", id).single();
    if (error) return Response.json({ error: error.message }, { status: 404 });
    return Response.json(data);
  }

  const { data, error } = await supabaseServer.from("products").select("*").order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) return Response.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  if (!body.name?.trim()) return Response.json({ error: "Nom obligatoire" }, { status: 400 });
  if (!body.price_ttc)    return Response.json({ error: "Prix obligatoire" }, { status: 400 });

  const clean = {
    ...body,
    name:        body.name.trim(),
    slug:        body.slug?.trim() || body.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    price_ttc:   isNaN(Number(body.price_ttc))   ? 0    : Number(body.price_ttc),
    promo_price: !body.promo_price || isNaN(Number(body.promo_price)) ? null : Number(body.promo_price),
    stock:       isNaN(Number(body.stock))        ? 0    : Number(body.stock),
    promo_start: body.promo_start || null,
    promo_end:   body.promo_end   || null,
  };

  const { data, error } = await supabaseServer.from("products").insert([clean]).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data);
}

export async function PUT(req: Request) {
  if (!isAuthorized(req)) return Response.json({ error: "Non autorisé" }, { status: 401 });

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

  const { data, error } = await supabaseServer.from("products").update(clean).eq("id", id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data);
}

export async function DELETE(req: Request) {
  if (!isAuthorized(req)) return Response.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return Response.json({ error: "id manquant" }, { status: 400 });

  const { data: product } = await supabaseServer.from("products").select("image_url, image_url_2, image_url_3, image_url_4").eq("id", id).single();

  if (product) {
    const urls = [product.image_url, product.image_url_2, product.image_url_3, product.image_url_4]
      .filter(Boolean)
      .filter((url: string) => url.includes("supabase"))
      .map((url: string) => url.split("/product-images/")[1])
      .filter(Boolean);
    if (urls.length > 0) await supabaseServer.storage.from("product-images").remove(urls);
  }

  const { error } = await supabaseServer.from("products").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}