import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { logActivity }  from "@/lib/server/audit";
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

  // Charger l'état actuel pour détecter le changement de statut livraison
  const { data: before } = await supabaseServer
    .from("orders")
    .select("shipping_status, tracking_number, customer_email")
    .eq("id", id).single();

  const { data, error } = await supabaseServer
    .from("orders").update(update).eq("id", id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });

  // Log si le statut livraison a changé
  if (shipping_status !== undefined && before && before.shipping_status !== shipping_status) {
    const shortId = String(id).slice(0, 8).toUpperCase();
    await logActivity(
      "commande_statut_modifie",
      `Statut livraison commande #${shortId} : ${before.shipping_status ?? "(none)"} → ${shipping_status}`,
      {
        entity_id: id,
        meta: {
          source:         "admin_manual",
          old_status:     before.shipping_status,
          new_status:     shipping_status,
          tracking_number: tracking_number ?? before.tracking_number,
          customer_email: before.customer_email,
        },
      }
    );
  }

  return Response.json(data);
}