import { supabaseServer } from "@/lib/server/supabase";

export async function POST(req: Request) {
  const { code, order_total } = await req.json();
  if (!code) return Response.json({ error: "Code manquant" }, { status: 400 });

  const { data, error } = await supabaseServer
    .from("promo_codes")
    .select("*")
    .eq("code", code.toUpperCase().trim())
    .eq("active", true)
    .single();

  if (error || !data) return Response.json({ error: "Code invalide ou expiré" }, { status: 404 });

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return Response.json({ error: "Ce code a expiré" }, { status: 400 });
  }

  if (data.max_uses !== null && data.uses_count >= data.max_uses) {
    return Response.json({ error: "Ce code a atteint son nombre maximum d'utilisations" }, { status: 400 });
  }

  const total = parseFloat(order_total) || 0;
  if (data.min_order && total < data.min_order) {
    return Response.json({ error: `Montant minimum requis : ${Number(data.min_order).toFixed(2)} €` }, { status: 400 });
  }

  // Calcul réduction
  let discount = 0;
  let free_shipping = false;

  if (data.discount_type === "percent") {
    discount = Math.round((total * data.discount_value) / 100 * 100) / 100;
  } else if (data.discount_type === "fixed") {
    discount = Math.min(data.discount_value, total);
  } else if (data.discount_type === "free_shipping") {
    free_shipping = true;
    discount = 4.90; // frais de port offerts
  }

  // ✅ NE PAS incrémenter ici — on incrémente dans le webhook après paiement réel
  // uses_count sera incrémenté dans stripe/webhook/route.ts

  return Response.json({
    valid:          true,
    code:           data.code,
    discount_type:  data.discount_type,
    discount_value: data.discount_value,
    discount,
    free_shipping,
    new_total:      Math.max(0, total - discount),
  });
}