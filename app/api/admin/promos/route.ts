import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

// Logger d'activité inline
async function logActivity(type: string, message: string, meta?: Record<string, unknown>) {
  try {
    await supabaseServer.from("activity_log").insert([{ type, message, meta: meta ?? null }]);
  } catch {}
}

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
  // ✅ Construction explicite — jamais de ...body (risque colonnes inconnues)
  const clean = {
    code:           (body.code ?? "").toUpperCase().trim(),
    discount_type:  body.discount_type ?? "percent",
    discount_value: isNaN(parseFloat(body.discount_value)) ? 0 : parseFloat(body.discount_value),
    min_order:      body.min_order  ? parseFloat(body.min_order)  : null,
    max_uses:       body.max_uses   ? parseInt(body.max_uses)     : null,
    expires_at:     body.expires_at || null,
    starts_at:      body.starts_at  || null,
    active:         body.active !== undefined ? body.active : true,
    uses_count:     0,
  };

  if (!clean.code) return Response.json({ error: "Code manquant" }, { status: 400 });

  const { data, error } = await supabaseServer
    .from("promo_codes").insert([clean]).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });

  await logActivity("promo_create", `Code promo créé : ${clean.code}`, {
    code: clean.code, discount_value: clean.discount_value, discount_type: clean.discount_type,
  });
  return Response.json(data);
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { id, ...rest } = await req.json();
  if (!id) return Response.json({ error: "id manquant" }, { status: 400 });

  const clean: any = {};
  if (rest.code           !== undefined) clean.code           = String(rest.code).toUpperCase().trim();
  if (rest.discount_value !== undefined) clean.discount_value = isNaN(parseFloat(rest.discount_value)) ? 0 : parseFloat(rest.discount_value);
  if (rest.discount_type  !== undefined) clean.discount_type  = rest.discount_type;
  if (rest.min_order      !== undefined) clean.min_order      = rest.min_order ? parseFloat(rest.min_order) : null;
  if (rest.max_uses       !== undefined) clean.max_uses       = rest.max_uses  ? parseInt(rest.max_uses)   : null;
  if (rest.expires_at     !== undefined) clean.expires_at     = rest.expires_at || null;
  if (rest.starts_at      !== undefined) clean.starts_at      = rest.starts_at  || null;
  if (rest.active         !== undefined) clean.active         = rest.active;

  const { data, error } = await supabaseServer
    .from("promo_codes").update(clean).eq("id", id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });

  await logActivity("promo_update", `Code promo modifié : ${clean.code ?? id}`, { id, ...clean });
  return Response.json(data);
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { id } = await req.json();
  if (!id) return Response.json({ error: "id manquant" }, { status: 400 });

  const { data: existing } = await supabaseServer
    .from("promo_codes").select("code").eq("id", id).single();
  const { error } = await supabaseServer.from("promo_codes").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 400 });

  await logActivity("promo_delete", `Code promo supprimé : ${existing?.code ?? id}`, {
    id, code: existing?.code,
  });
  return Response.json({ ok: true });
}