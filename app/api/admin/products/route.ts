import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import { logActivity }    from "@/lib/server/audit";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const { data, error } = await supabaseServer
      .from("products").select("*").eq("id", id).single();
    if (error) return Response.json({ error: error.message }, { status: 404 });
    return Response.json(data);
  }

  const { data, error } = await supabaseServer
    .from("products").select("*").order("position", { ascending: true });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const body  = await req.json();
  const clean: Record<string, any> = { ...body };

  if ("price_ttc"   in body) clean.price_ttc   = Math.max(0, isNaN(Number(body.price_ttc))   ? 0 : Number(body.price_ttc));
  if ("promo_price" in body) clean.promo_price  = (!body.promo_price || isNaN(Number(body.promo_price))) ? null : Math.max(0, Number(body.promo_price));
  if ("stock"       in body) clean.stock        = Math.max(0, isNaN(Number(body.stock))       ? 0 : Number(body.stock));
  if ("promo_start" in body) clean.promo_start  = body.promo_start || null;
  if ("promo_end"   in body) clean.promo_end    = body.promo_end   || null;
  if ("position"    in body) clean.position     = isNaN(Number(body.position))    ? 0 : Number(body.position);
  if ("weight_g"    in body) clean.weight_g     = (!body.weight_g || isNaN(Number(body.weight_g))) ? null : Number(body.weight_g);
  if ("fiche_cards" in body) clean.fiche_cards  = Array.isArray(body.fiche_cards) ? body.fiche_cards : null;
  if ("fiche_faqs"  in body) clean.fiche_faqs   = Array.isArray(body.fiche_faqs)  ? body.fiche_faqs  : null;

  const { data, error } = await supabaseServer
    .from("products").insert([clean]).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });

  await logActivity(
    "produit_cree",
    `Produit créé : ${data.name ?? data.id}`,
    {
      entity_id:   data.id,
      entity_name: data.name ?? null,
      meta: {
        price_ttc: data.price_ttc,
        stock:     data.stock,
        published: data.published ?? null,
      },
    }
  );

  return Response.json(data);
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { id, ...rest } = await req.json();
  if (!id) return Response.json({ error: "id manquant" }, { status: 400 });

  const clean: Record<string, any> = { ...rest };
  if ("price_ttc"   in rest) clean.price_ttc   = Math.max(0, isNaN(Number(rest.price_ttc))   ? 0 : Number(rest.price_ttc));
  if ("promo_price" in rest) clean.promo_price  = (!rest.promo_price || isNaN(Number(rest.promo_price))) ? null : Math.max(0, Number(rest.promo_price));
  if ("stock"       in rest) clean.stock        = Math.max(0, isNaN(Number(rest.stock))       ? 0 : Number(rest.stock));
  if ("promo_start" in rest) clean.promo_start  = rest.promo_start || null;
  if ("promo_end"   in rest) clean.promo_end    = rest.promo_end   || null;
  if ("position"    in rest) clean.position     = isNaN(Number(rest.position))    ? 0 : Number(rest.position);
  if ("weight_g"    in rest) clean.weight_g     = (!rest.weight_g || isNaN(Number(rest.weight_g))) ? null : Number(rest.weight_g);
  if ("fiche_cards" in rest) clean.fiche_cards  = Array.isArray(rest.fiche_cards) ? rest.fiche_cards : null;
  if ("fiche_faqs"  in rest) clean.fiche_faqs   = Array.isArray(rest.fiche_faqs)  ? rest.fiche_faqs  : null;

  // Charger l'état actuel pour détecter les champs modifiés (prix/stock/published)
  const { data: before } = await supabaseServer
    .from("products")
    .select("name, price_ttc, promo_price, stock, published")
    .eq("id", id).single();

  const { data, error } = await supabaseServer
    .from("products").update(clean).eq("id", id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });

  // Détecter les changements significatifs
  const changes: Record<string, { old: any; new: any }> = {};
  if (before) {
    if ("price_ttc"   in clean && before.price_ttc   !== data.price_ttc)   changes.price_ttc   = { old: before.price_ttc,   new: data.price_ttc };
    if ("promo_price" in clean && before.promo_price !== data.promo_price) changes.promo_price = { old: before.promo_price, new: data.promo_price };
    if ("stock"       in clean && before.stock       !== data.stock)       changes.stock       = { old: before.stock,       new: data.stock };
    if ("published"   in clean && before.published   !== data.published)   changes.published   = { old: before.published,   new: data.published };
  }

  const changeKeys = Object.keys(changes);
  const summary = changeKeys.length > 0
    ? changeKeys.map(k => `${k}: ${changes[k].old} → ${changes[k].new}`).join(", ")
    : "champs divers";

  await logActivity(
    "produit_modifie",
    `Produit modifié : ${data.name ?? data.id} (${summary})`,
    {
      entity_id:   data.id,
      entity_name: data.name ?? null,
      meta: {
        changes,
        fields_updated: Object.keys(clean),
      },
    }
  );

  return Response.json(data);
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { id } = await req.json();
  if (!id) return Response.json({ error: "id manquant" }, { status: 400 });

  const { data: product } = await supabaseServer
    .from("products")
    .select("name, image_url, image_url_2, image_url_3, image_url_4")
    .eq("id", id).single();

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

  await logActivity(
    "produit_supprime",
    `Produit supprimé : ${product?.name ?? id}`,
    {
      entity_id:   id,
      entity_name: product?.name ?? null,
    }
  );

  return Response.json({ ok: true });
}
