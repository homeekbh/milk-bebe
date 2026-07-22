import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

// GET /api/admin/factures/[id] — données d'UNE facture pour la page imprimable.
// Lecture seule, admin only. Renvoie la commande (une facture = une commande payée).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { data, error } = await supabaseServer
    .from("orders")
    .select("id, invoice_number, created_at, customer_name, customer_email, customer_phone, shipping_address, items, amount_total, delivery_price, discount, promo_code, status, refund_amount, refunded_at")
    .eq("id", id)
    .single();

  if (error || !data) {
    return Response.json({ error: "Commande introuvable" }, { status: 404 });
  }
  return Response.json(data);
}
