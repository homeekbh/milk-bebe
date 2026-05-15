import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { data } = await supabaseServer
    .from("orders")
    .select("customer_email");

  const unique = new Set(
    (data ?? [])
      .map((o: any) => o.customer_email?.toLowerCase().trim())
      .filter(Boolean)
  ).size;

  return Response.json({ count: unique });
}