import { supabaseServer } from "@/lib/server/supabase";
import type { NextRequest } from "next/server";

/**
 * POST /api/stats/add-to-cart
 * Enregistre un événement AddToCart côté serveur
 * Body: { product_id, slug, name, category, price, quantity, session_id }
 */
export async function POST(req: NextRequest) {
  try {
    const { product_id, slug, name, category, price, quantity, session_id } = await req.json();
    if (!slug) return Response.json({ ok: false });

    await supabaseServer.from("add_to_cart_events").insert([{
      product_id:  product_id  ?? null,
      slug,
      name:        name        ?? null,
      category:    category    ?? null,
      price:       price       ?? null,
      quantity:    quantity    ?? 1,
      session_id:  session_id  ?? null,
      added_at:    new Date().toISOString(),
    }]);

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false });
  }
}