import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

async function logActivity(type: string, message: string, meta?: Record<string, unknown>) {
  try {
    await supabaseServer.from("activity_log").insert([{ type, message, meta: meta ?? null }]);
  } catch {}
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { data, error } = await supabaseServer
    .from("promo_codes").select("*").order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { data, error } = await supabaseServer
    .from("promo_codes")
    .insert([{ ...body, uses_count: 0, active: true }])
    .select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });

  await logActivity("promo_create", `Code promo créé : ${body.code ?? ""}`, { code: body.code, discount_value: body.discount_value });
  return Response.json(data);
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { id, ...rest } = await req.json();
  if (!id) return Response.json({ error: "id manquant" }, { status: 400 });
  const { data, error } = await supabaseServer
    .from("promo_codes").update(rest).eq("id", id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });

  await logActivity("promo_update", `Code promo modifié : ${rest.code ?? id}`, { id, ...rest });
  return Response.json(data);
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { id } = await req.json();
  if (!id) return Response.json({ error: "id manquant" }, { status: 400 });

  // Récupérer le code avant suppression pour le log
  const { data: existing } = await supabaseServer.from("promo_codes").select("code").eq("id", id).single();
  const { error } = await supabaseServer.from("promo_codes").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 400 });

  await logActivity("promo_delete", `Code promo supprimé : ${existing?.code ?? id}`, { id, code: existing?.code });
  return Response.json({ ok: true });
}