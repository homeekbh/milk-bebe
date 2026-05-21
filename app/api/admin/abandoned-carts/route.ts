import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { data, error } = await supabaseServer
    .from("abandoned_carts")
    .select("id, email, items, total, converted, relance_1, relance_2, relance_3, created_at, email_sent_at, promo_code")
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ carts: data ?? [] });
}
