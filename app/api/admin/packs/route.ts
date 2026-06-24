import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import { logActivity }    from "@/lib/server/audit";
import type { NextRequest } from "next/server";

const PRODUCT_COLS = "id, name, slug, price_ttc, image_url, sizes, sizes_stock, stock, colors";

function slugify(s: string): string {
  return (s || "")
    .toLowerCase().trim()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    .slice(0, 60) || "pack";
}

// GET — tous les packs (actifs + inactifs) avec leurs produits
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { data, error } = await supabaseServer
    .from("packs")
    .select(`*, pack_items ( position, product:products ( ${PRODUCT_COLS} ) )`)
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const packs = (data ?? []).map((p: any) => ({
    ...p,
    pack_items: (p.pack_items ?? []).sort((a: any, b: any) => a.position - b.position),
  }));
  return Response.json({ packs });
}

// Insère les pack_items dans l'ordre fourni (position = index).
async function setPackItems(packId: string, productIds: string[]) {
  const rows = productIds.map((pid, i) => ({ pack_id: packId, product_id: pid, position: i }));
  return supabaseServer.from("pack_items").insert(rows);
}

function validate(body: any): string | null {
  if (!body.title || !String(body.title).trim()) return "Titre requis";
  if (body.price == null || isNaN(parseFloat(body.price))) return "Prix requis";
  if (!Array.isArray(body.product_ids)) return "product_ids doit être un tableau";
  if (body.product_ids.length < 2) return "Un pack doit contenir au moins 2 produits";
  if (body.product_ids.length > 4) return "Un pack contient au maximum 4 produits";
  return null;
}

// POST — créer
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const err = validate(body);
  if (err) return Response.json({ error: err }, { status: 400 });

  // Slug unique : base depuis le titre, suffixe si collision.
  let slug = slugify(body.title);
  const { data: existing } = await supabaseServer.from("packs").select("slug").eq("slug", slug).maybeSingle();
  if (existing) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const { data: pack, error: packErr } = await supabaseServer
    .from("packs")
    .insert([{
      slug,
      title:       String(body.title).trim(),
      description: body.description?.trim() || null,
      price:       parseFloat(body.price),
      image_url:   body.image_url?.trim() || null,
      active:      body.active !== undefined ? Boolean(body.active) : true,
    }])
    .select()
    .single();
  if (packErr) return Response.json({ error: packErr.message }, { status: 400 });

  const { error: itemsErr } = await setPackItems(pack.id, body.product_ids);
  if (itemsErr) {
    // rollback best-effort
    await supabaseServer.from("packs").delete().eq("id", pack.id);
    return Response.json({ error: itemsErr.message }, { status: 400 });
  }

  await logActivity("pack_create", `Pack créé : ${pack.title}`, { entity_id: pack.id, meta: { slug, price: pack.price, products: body.product_ids.length } });
  return Response.json({ ok: true, pack });
}

// PUT — modifier
export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  if (!body.id) return Response.json({ error: "id manquant" }, { status: 400 });
  const err = validate(body);
  if (err) return Response.json({ error: err }, { status: 400 });

  const { error: upErr } = await supabaseServer
    .from("packs")
    .update({
      title:       String(body.title).trim(),
      description: body.description?.trim() || null,
      price:       parseFloat(body.price),
      image_url:   body.image_url?.trim() || null,
      active:      Boolean(body.active),
    })
    .eq("id", body.id);
  if (upErr) return Response.json({ error: upErr.message }, { status: 400 });

  // Remplace tous les pack_items
  await supabaseServer.from("pack_items").delete().eq("pack_id", body.id);
  const { error: itemsErr } = await setPackItems(body.id, body.product_ids);
  if (itemsErr) return Response.json({ error: itemsErr.message }, { status: 400 });

  await logActivity("pack_update", `Pack modifié : ${String(body.title).trim()}`, { entity_id: body.id, meta: { price: parseFloat(body.price), products: body.product_ids.length } });
  return Response.json({ ok: true });
}

// DELETE — supprimer (cascade pack_items via FK)
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { id } = await req.json();
  if (!id) return Response.json({ error: "id manquant" }, { status: 400 });

  const { data: existing } = await supabaseServer.from("packs").select("title").eq("id", id).maybeSingle();
  const { error } = await supabaseServer.from("packs").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 400 });

  await logActivity("pack_delete", `Pack supprimé : ${existing?.title ?? id}`, { entity_id: id });
  return Response.json({ ok: true });
}
