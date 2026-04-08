import { supabaseServer } from "@/lib/server/supabase";

export async function GET() {
  const { data } = await supabaseServer
    .from("promo_codes").select("*").order("created_at", { ascending: false });
  return Response.json(data ?? []);
}

export async function POST(req: Request) {
  const body = await req.json();

  const clean = {
    ...body,
    code:           (body.code ?? "").toUpperCase().trim(),
    discount_value: isNaN(parseFloat(body.discount_value)) ? 0 : parseFloat(body.discount_value),
    min_order:      isNaN(parseFloat(body.min_order))      ? 0 : parseFloat(body.min_order),
    max_uses:       body.max_uses ? parseInt(body.max_uses) : null,
    expires_at:     body.expires_at || null,
    uses_count:     0,
  };

  if (!clean.code) return Response.json({ error: "Code manquant" }, { status: 400 });

  const { data, error } = await supabaseServer
    .from("promo_codes").insert([clean]).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data);
}

export async function PUT(req: Request) {
  const { id, ...rest } = await req.json();
  if (!id) return Response.json({ error: "id manquant" }, { status: 400 });

  const clean: any = { ...rest };
  if (rest.discount_value !== undefined) clean.discount_value = isNaN(parseFloat(rest.discount_value)) ? 0    : parseFloat(rest.discount_value);
  if (rest.min_order      !== undefined) clean.min_order      = isNaN(parseFloat(rest.min_order))      ? 0    : parseFloat(rest.min_order);
  if (rest.max_uses       !== undefined) clean.max_uses       = rest.max_uses ? parseInt(rest.max_uses) : null;
  if (rest.expires_at     !== undefined) clean.expires_at     = rest.expires_at || null;

  const { data, error } = await supabaseServer
    .from("promo_codes").update(clean).eq("id", id).select().single();
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