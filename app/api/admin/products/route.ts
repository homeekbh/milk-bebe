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
  delete clean.stock_touched;   // drapeau client (cf. PUT) — pas une colonne

  if ("price_ttc"   in body) clean.price_ttc   = Math.max(0, isNaN(Number(body.price_ttc))   ? 0 : Number(body.price_ttc));
  if ("promo_price" in body) clean.promo_price  = (!body.promo_price || isNaN(Number(body.promo_price))) ? null : Math.max(0, Number(body.promo_price));
  if ("stock"       in body) clean.stock        = Math.max(0, isNaN(Number(body.stock))       ? 0 : Number(body.stock));
  if ("promo_start" in body) clean.promo_start  = body.promo_start || null;
  if ("promo_end"   in body) clean.promo_end    = body.promo_end   || null;
  if ("position"    in body) clean.position     = isNaN(Number(body.position))    ? 0 : Number(body.position);
  if ("weight_g"    in body) clean.weight_g     = (!body.weight_g || isNaN(Number(body.weight_g))) ? null : Number(body.weight_g);
  if ("fiche_cards" in body) clean.fiche_cards  = Array.isArray(body.fiche_cards) ? body.fiche_cards : null;
  if ("fiche_faqs"  in body) clean.fiche_faqs   = Array.isArray(body.fiche_faqs)  ? body.fiche_faqs  : null;
  if ("fiche_cards_en" in body) clean.fiche_cards_en = Array.isArray(body.fiche_cards_en) ? body.fiche_cards_en : null;
  if ("fiche_faqs_en"  in body) clean.fiche_faqs_en  = Array.isArray(body.fiche_faqs_en)  ? body.fiche_faqs_en  : null;

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
  if ("fiche_cards_en" in rest) clean.fiche_cards_en = Array.isArray(rest.fiche_cards_en) ? rest.fiche_cards_en : null;
  if ("fiche_faqs_en"  in rest) clean.fiche_faqs_en  = Array.isArray(rest.fiche_faqs_en)  ? rest.fiche_faqs_en  : null;

  // ── BUG #1 (résurrection stock / survente) — écriture SÉLECTIVE du stock ──────────────
  // Le client indique via stock_touched si l'admin a RÉELLEMENT modifié un stock :
  //   • true  → recomptage admin : on écrit les valeurs saisies (absolues) telles quelles.
  //   • false → édition SANS toucher au stock (photo, description, SEO…) : on ne réécrit NI
  //     products.stock NI products.sizes_stock, et pour colors on RÉ-APPLIQUE le stock LIVE
  //     (sizes_stock + agrégat stock, par id de motif) lu à l'instant du save. Ainsi les
  //     décréments de ventes survenus depuis l'ouverture de la fiche ne sont JAMAIS écrasés.
  // stock_touched absent (ancien client / toggle publish) → true = comportement historique.
  const stockTouched = rest.stock_touched !== false;
  delete clean.stock_touched;
  if (!stockTouched) {
    delete clean.stock;         // products.stock : jamais ressuscité en cas B
    delete clean.sizes_stock;   // products.sizes_stock (produits sans motif) : idem
    if (Array.isArray(clean.colors)) {
      const { data: liveRow } = await supabaseServer.from("products").select("colors").eq("id", id).single();
      const live = Array.isArray(liveRow?.colors) ? liveRow.colors : [];
      const liveById = new Map(live.filter((c: any) => c?.id).map((c: any) => [String(c.id), c]));
      clean.colors = clean.colors.map((c: any) => {
        const lv = c?.id ? liveById.get(String(c.id)) : null;
        // Motif existant → garder le stock LIVE (ventes préservées), appliquer nom/hex/image/tailles saisis.
        // Motif nouveau (pas d'id live) → laisser tel quel (mais un ajout de motif ⇒ cas A côté client).
        return lv ? { ...c, sizes_stock: lv.sizes_stock ?? {}, stock: lv.stock ?? 0 } : c;
      });
    }
  }

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
