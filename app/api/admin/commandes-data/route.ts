import { supabaseServer } from "@/lib/server/supabase";

export async function GET() {
  const { data, error } = await supabaseServer
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

export async function PUT(req: Request) {
  const { id, ...rest } = await req.json();
  if (!id) return Response.json({ error: "id manquant" }, { status: 400 });

  const update: any = {};
  if (rest.shipping_status  !== undefined) update.shipping_status  = rest.shipping_status;
  if (rest.tracking_number  !== undefined) update.tracking_number  = rest.tracking_number;
  if (rest.notes            !== undefined) update.notes            = rest.notes;

  // Log timestamp email si statut expédiée
  if (rest.shipping_status === "shipped") {
    update.email_sent_at = new Date().toISOString();
  }

  const { data, error } = await supabaseServer
    .from("orders").update(update).eq("id", id).select().single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true, data });
}