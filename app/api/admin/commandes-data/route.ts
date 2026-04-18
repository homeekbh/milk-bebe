import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const { data, error } = await supabaseServer
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return Response.json([]);
    return Response.json(data ?? []);
  } catch {
    return Response.json([]);
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { id, shipping_status, tracking_number, notes, email_sent_at } = await req.json();
  if (!id) return Response.json({ error: "id manquant" }, { status: 400 });

  const update: Record<string, any> = {};
  if (shipping_status !== undefined) update.shipping_status = shipping_status;
  if (tracking_number  !== undefined) update.tracking_number  = tracking_number;
  if (notes            !== undefined) update.notes            = notes;
  if (email_sent_at    !== undefined) update.email_sent_at    = email_sent_at;

  const { data, error } = await supabaseServer
    .from("orders").update(update).eq("id", id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data);
}