import { supabaseServer } from "@/lib/server/supabase";

export async function GET() {
  const { data, error } = await supabaseServer
    .from("promo_codes").select("*").order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { data, error } = await supabaseServer
    .from("promo_codes")
    .insert([{ ...body, uses_count: 0, active: true }])
    .select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data);
}

export async function PUT(req: Request) {
  const { id, ...rest } = await req.json();
  if (!id) return Response.json({ error: "id manquant" }, { status: 400 });
  const { data, error } = await supabaseServer
    .from("promo_codes").update(rest).eq("id", id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data);
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  if (!id) return Response.json({ error: "id manquant" }, { status: 400 });
  const { error } = await supabaseServer.from("promo_codes").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}