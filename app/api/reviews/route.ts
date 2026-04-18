import { supabaseServer } from "@/lib/server/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const product_id = searchParams.get("product_id");

  let query = supabaseServer
    .from("reviews")
    .select("id, customer_name, rating, comment, reply, created_at")
    .eq("approved", true)
    .order("created_at", { ascending: false });

  if (product_id) query = query.eq("product_id", product_id);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

export async function POST(req: Request) {
  const { order_id, product_id, customer_email, customer_name, rating, comment } = await req.json();

  if (!customer_email || !customer_name || !rating || !product_id) {
    return Response.json({ error: "Données manquantes" }, { status: 400 });
  }

  if (rating < 1 || rating > 5) {
    return Response.json({ error: "Note invalide" }, { status: 400 });
  }

  // Vérifier que la commande existe pour cet email
  if (order_id) {
    const { data: order } = await supabaseServer
      .from("orders")
      .select("id, customer_email")
      .eq("id", order_id)
      .eq("customer_email", customer_email.toLowerCase().trim())
      .single();
    if (!order) {
      return Response.json({ error: "Commande introuvable" }, { status: 403 });
    }
  }

  const { data, error } = await supabaseServer
    .from("reviews")
    .insert([{
      order_id:       order_id   ?? null,
      product_id,
      customer_email: customer_email.toLowerCase().trim(),
      customer_name:  customer_name.trim().slice(0, 100),
      rating:         Number(rating),
      comment:        comment?.trim().slice(0, 1000) ?? null,
      approved:       false, // modération admin
    }])
    .select().single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true, id: data.id });
}