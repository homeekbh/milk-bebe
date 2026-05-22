import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

const SENDCLOUD_API = "https://panel.sendcloud.sc/api/v3";

function getBasicAuth() {
  const pub = process.env.SENDCLOUD_PUBLIC_KEY ?? "";
  const sec = process.env.SENDCLOUD_SECRET_KEY ?? "";
  return "Basic " + Buffer.from(`${pub}:${sec}`).toString("base64");
}

/**
 * POST /api/admin/sendcloud/cancel
 * Body: { order_id: string }
 *
 * 1. Charge la commande
 * 2. POST /parcels/{parcel_id}/cancel côté Sendcloud
 * 3. Reset les champs orders (tracking, label_url, parcel_id, shipped_at)
 *    + shipping_status = "annulee"
 * 4. Aucun email automatique
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const { order_id } = await req.json();
    if (!order_id) return Response.json({ error: "order_id manquant" }, { status: 400 });

    const { data: order, error: orderErr } = await supabaseServer
      .from("orders")
      .select("id, sendcloud_parcel_id, tracking_number")
      .eq("id", order_id)
      .single();

    if (orderErr || !order) {
      return Response.json({ error: "Commande introuvable" }, { status: 404 });
    }

    const parcelId = order.sendcloud_parcel_id;

    // Si parcel_id présent, on tente l'annulation côté Sendcloud (best-effort)
    if (parcelId) {
      try {
        const cancelRes = await fetch(`${SENDCLOUD_API}/parcels/${parcelId}/cancel`, {
          method:  "POST",
          headers: {
            Authorization:  getBasicAuth(),
            "Content-Type": "application/json",
            Accept:         "application/json",
          },
        });
        const text = await cancelRes.text();
        console.error(`[sendcloud:cancel] parcel=${parcelId} HTTP ${cancelRes.status} body=${text.slice(0, 600)}`);
        // 200/204 = succès, 400/404 = colis déjà annulé / introuvable → on continue le reset DB
      } catch (e) {
        console.error("[sendcloud:cancel] fetch error:", e);
        // On continue quand même le reset DB
      }
    }

    // Reset Supabase — statut "annulee" (pour que le bouton "Informer le client" s'affiche)
    // Le bouton "Générer l'étiquette" reste actif car il vérifie !order.label_url (réinitialisé)
    const { error: updateErr } = await supabaseServer
      .from("orders")
      .update({
        shipping_status:     "annulee",
        tracking_number:     null,
        label_url:           null,
        sendcloud_parcel_id: null,
        shipped_at:          null,
      })
      .eq("id", order_id);

    if (updateErr) {
      console.error("[sendcloud:cancel] Supabase update error:", updateErr);
      return Response.json({ error: updateErr.message }, { status: 500 });
    }

    return Response.json({ ok: true, parcel_id: parcelId });
  } catch (e: any) {
    console.error("[sendcloud:cancel] exception:", e);
    return Response.json({ error: e.message ?? "Erreur interne" }, { status: 500 });
  }
}
