import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { data } = await supabaseServer
    .from("promo_codes").select("*").order("created_at", { ascending: false });
  return Response.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const body  = await req.json();
  // ✅ Construction explicite — ne jamais faire ...body (risque de colonnes inconnues)
  const clean = {
    code:           (body.code ?? "").toUpperCase().trim(),
    discount_type:  body.discount_type ?? body.type ?? "percent",
    discount_value: isNaN(parseFloat(body.discount_value ?? body.value)) ? 0 : parseFloat(body.discount_value ?? body.value),
    min_order:      body.min_order ? parseFloat(body.min_order) : null,
    max_uses:       body.max_uses  ? parseInt(body.max_uses)    : null,
    expires_at:     body.expires_at || null,
    starts_at:      body.starts_at  || null,
    active:         body.active !== undefined ? body.active : true,
    uses_count:     0,
  };

  if (!clean.code) return Response.json({ error: "Code manquant" }, { status: 400 });

  const { data, error } = await supabaseServer
    .from("promo_codes").insert([clean]).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data);
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { id, ...rest } = await req.json();
  if (!id) return Response.json({ error: "id manquant" }, { status: 400 });

  const clean: any = { ...rest };
  if (rest.discount_value !== undefined) clean.discount_value = isNaN(parseFloat(rest.discount_value)) ? 0 : parseFloat(rest.discount_value);
  if (rest.min_order      !== undefined) clean.min_order      = isNaN(parseFloat(rest.min_order))      ? 0 : parseFloat(rest.min_order);
  if (rest.max_uses       !== undefined) clean.max_uses       = rest.max_uses ? parseInt(rest.max_uses) : null;
  if (rest.expires_at     !== undefined) clean.expires_at     = rest.expires_at || null;

  const { data, error } = await supabaseServer
    .from("promo_codes").update(clean).eq("id", id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data);
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { id } = await req.json();
  if (!id) return Response.json({ error: "id manquant" }, { status: 400 });
  const { error } = await supabaseServer.from("promo_codes").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}