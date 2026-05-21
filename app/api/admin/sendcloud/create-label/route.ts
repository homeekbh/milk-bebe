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
 * POST /api/admin/sendcloud/create-label
 * Body: { order_id: string, method_id?: number }
 *
 * 1. Charge la commande depuis Supabase
 * 2. Crée le colis dans Sendcloud (create & announce)
 * 3. Génère l'étiquette PDF
 * 4. Sauvegarde tracking_number + label_url dans la commande
 * 5. Passe le statut à "shipped"
 */
export async function POST(req: NextRequest) {
  // Auth admin
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const { order_id, method_id, sendcloud_id } = await req.json();
    if (!order_id) return Response.json({ error: "order_id manquant" }, { status: 400 });

    // ── 1. Charger la commande ─────────────────────────────────────────────
    const { data: order, error: orderErr } = await supabaseServer
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();

    if (orderErr || !order) {
      return Response.json({ error: "Commande introuvable" }, { status: 404 });
    }

    const addr = order.shipping_address ?? {};

    // ── 2. Créer le colis Sendcloud ────────────────────────────────────────
    const parcelPayload = {
      parcel: {
        name:               `${addr.first_name ?? ""} ${addr.last_name ?? order.customer_name ?? ""}`.trim(),
        company_name:       addr.company ?? "",
        address:            addr.line1 ?? addr.address ?? "",
        address_2:          addr.line2 ?? "",
        city:               addr.city ?? "",
        postal_code:        addr.postal_code ?? "",
        country:            { iso_2: addr.country ?? "FR" },
        email:              order.customer_email ?? "",
        telephone:          addr.phone ?? "",
        order_number:       order.id,
        weight:             order.total_weight_g ? String(order.total_weight_g / 1000) : "0.5",
        shipment: {
          id: sendcloud_id ?? method_id ?? Number(process.env.SENDCLOUD_DEFAULT_METHOD_ID ?? 371),
        },
        sender_address: Number(process.env.SENDCLOUD_SENDER_ADDRESS_ID ?? 0),
        request_label: true,
      },
    };

    const createRes = await fetch(`${SENDCLOUD_API}/parcels`, {
      method:  "POST",
      headers: {
        Authorization:  getBasicAuth(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parcelPayload),
    });

    const createData = await createRes.json();

    if (!createRes.ok) {
      console.error("Sendcloud create parcel error:", createData);
      return Response.json(
        { error: createData?.error?.message ?? createData?.message ?? "Erreur Sendcloud lors de la création du colis" },
        { status: 400 }
      );
    }

    const parcel = createData.parcel;
    const trackingNumber = parcel?.tracking_number ?? parcel?.tracking?.tracking_number ?? "";
    const labelUrl       = parcel?.label?.normal_printer?.[0] ?? parcel?.label?.label_printer?.[0] ?? "";
    const parcelId       = parcel?.id ?? null;

    // ── 3. Mettre à jour la commande ──────────────────────────────────────
    const { error: updateErr } = await supabaseServer
      .from("orders")
      .update({
        shipping_status:  "shipped",
        tracking_number:  trackingNumber || null,
        label_url:        labelUrl       || null,
        sendcloud_parcel_id: parcelId    || null,
        shipped_at:       new Date().toISOString(),
      })
      .eq("id", order_id);

    if (updateErr) {
      console.error("Supabase update error:", updateErr);
      // On ne bloque pas — l'étiquette est créée même si la mise à jour échoue
    }

    return Response.json({
      ok:              true,
      tracking_number: trackingNumber,
      label_url:       labelUrl,
      parcel_id:       parcelId,
    });

  } catch (e: any) {
    console.error("create-label error:", e);
    return Response.json({ error: e.message ?? "Erreur interne" }, { status: 500 });
  }
}