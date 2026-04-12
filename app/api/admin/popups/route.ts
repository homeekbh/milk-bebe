import { supabaseServer } from "@/lib/server/supabase";

export async function GET() {
  const { data, error } = await supabaseServer
    .from("popups").select("*").order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

export async function POST(req: Request) {
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
  return Response.json(data);
}

export async function PUT(req: Request) {
  const { id, ...rest } = await req.json();
  if (!id) return Response.json({ error: "id manquant" }, { status: 400 });

  const { data, error } = await supabaseServer
    .from("popups").update(rest).eq("id", id).select().single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true, data });
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  if (!id) return Response.json({ error: "id manquant" }, { status: 400 });
  const { error } = await supabaseServer.from("popups").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}