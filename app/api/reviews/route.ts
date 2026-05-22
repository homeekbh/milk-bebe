import { supabaseServer } from "@/lib/server/supabase";

// Rate limiting simple
const rlMap = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rlMap.get(ip);
  if (!entry || now > entry.resetAt) { rlMap.set(ip, { count: 1, resetAt: now + 60_000 }); return false; }
  if (entry.count >= 2) return true;
  entry.count++;
  return false;
}

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
  // Rate limiting
  const ip = (req as any).headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return Response.json({ error: "Trop de requêtes." }, { status: 429 });
  }

  const { order_id, product_id, customer_email, customer_name, rating, comment } = await req.json();

  if (!customer_email || !customer_name || !rating || !product_id) {
    return Response.json({ error: "Données manquantes" }, { status: 400 });
  }
  if (rating < 1 || rating > 5) {
    return Response.json({ error: "Note invalide" }, { status: 400 });
  }

  const emailClean = customer_email.toLowerCase().trim();

  // ✅ Vérification acheteur réel — l'email doit avoir une commande delivered ou shipped
  const { data: order } = await supabaseServer
    .from("orders")
    .select("id, customer_email, shipping_status")
    .eq("customer_email", emailClean)
    .in("shipping_status", ["expediee", "livree"])
    .limit(1)
    .single();

  if (!order) {
    return Response.json(
      { error: "Seuls les acheteurs ayant reçu leur commande peuvent laisser un avis." },
      { status: 403 }
    );
  }

  // Vérifier que l'email n'a pas déjà laissé un avis pour ce produit
  const { data: existing } = await supabaseServer
    .from("reviews")
    .select("id")
    .eq("customer_email", emailClean)
    .eq("product_id", product_id)
    .limit(1)
    .single();

  if (existing) {
    return Response.json({ error: "Tu as déjà laissé un avis pour ce produit." }, { status: 409 });
  }

  const { data, error } = await supabaseServer
    .from("reviews")
    .insert([{
      order_id:       order.id,
      product_id,
      customer_email: emailClean,
      customer_name:  customer_name.trim().slice(0, 100),
      rating:         Number(rating),
      comment:        comment?.trim().slice(0, 1000) ?? null,
      approved:       false,
    }])
    .select().single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true, id: data.id });
}