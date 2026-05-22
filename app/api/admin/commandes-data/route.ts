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
      .order("created_at", { ascending: false })
      .limit(50000);
    if (error) {
      // Log explicite — avant on swallow silencieusement, ce qui cachait les
      // erreurs Supabase (ex: colonne manquante après migration)
      console.error("[admin/commandes-data] Supabase error:", error.message, error.details);
      return Response.json({ error: error.message, details: error.details ?? null }, { status: 500 });
    }
    return Response.json(data ?? []);
  } catch (e: any) {
    console.error("[admin/commandes-data] exception:", e?.message);
    return Response.json({ error: e?.message ?? "Erreur interne" }, { status: 500 });
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