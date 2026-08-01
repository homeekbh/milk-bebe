import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import { logActivity }    from "@/lib/server/audit";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { data, error } = await supabaseServer
    .from("popups").select("*").order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  if (!body.title || !body.message) return Response.json({ error: "title et message requis" }, { status: 400 });

  const { data, error } = await supabaseServer.from("popups").insert([{
    title:      body.title,
    message:    body.message,
    promo_code: body.promo_code || null,
    starts_at:  body.starts_at  || null,
    ends_at:    body.ends_at    || null,
    active:     body.active ?? true,
  }]).select().single();

  if (error) return Response.json({ error: error.message }, { status: 400 });

  await logActivity("popup_cree", `Popup créée : ${data.title}`, {
    entity_id: data.id, entity_name: data.title,
  });
  return Response.json(data);
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { id, ...rest } = await req.json();
  if (!id) return Response.json({ error: "id manquant" }, { status: 400 });

  const { data, error } = await supabaseServer
    .from("popups").update(rest).eq("id", id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });

  await logActivity("popup_modifiee", `Popup modifiée : ${data?.title ?? id}`, {
    entity_id: String(id), entity_name: data?.title ?? null,
  });
  return Response.json({ ok: true, data });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { id } = await req.json();
  if (!id) return Response.json({ error: "id manquant" }, { status: 400 });
  const { data: existing } = await supabaseServer.from("popups").select("title").eq("id", id).single();
  const { error } = await supabaseServer.from("popups").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 400 });

  await logActivity("popup_supprimee", `Popup supprimée : ${existing?.title ?? id}`, {
    entity_id: String(id), entity_name: existing?.title ?? null,
  });
  return Response.json({ ok: true });
}
