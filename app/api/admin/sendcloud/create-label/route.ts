import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

// Mapping transporteur M!LK → shipping_option_code Sendcloud v3
const CARRIER_CODES: Record<string, string> = {
  "La Poste — Colissimo": "colissimo:home_signature",
  "Chronopost":           "chronopost:classic",
  "DHL":                  "dhl:express",
  "UPS":                  "ups:standard",
  "Mondial Relay":        "mondial_relay:standard",
  "TNT":                  "tnt:express",
};

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { order_id, transporteur, customer, items } = await req.json();

  if (!order_id || !customer) {
    return Response.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const publicKey = process.env.SENDCLOUD_PUBLIC_KEY;
  const secretKey = process.env.SENDCLOUD_SECRET_KEY;

  if (!publicKey || !secretKey) {
    return Response.json({ error: "Sendcloud non configuré — clés API manquantes" }, { status: 500 });
  }

  const totalItems = Array.isArray(items)
    ? items.reduce((sum: number, i: any) => sum + (i.quantity ?? 1), 0)
    : 1;
  const weightKg = Math.max(0.5, totalItems * 0.2);

  const shippingCode = CARRIER_CODES[transporteur] ?? "colissimo:home_signature";

  // Format API v3 — shipments endpoint
  const shipmentBody = {
    to_address: {
      name:           customer.name ?? "",
      address_line_1: customer.address ?? "",
      postal_code:    customer.zip ?? "",
      city:           customer.city ?? "",
      country_code:   customer.country ?? "FR",
      email:          customer.email ?? "",
      phone_number:   "",
    },
    ship_with: {
      type: "shipping_option_code",
      properties: {
        shipping_option_code: shippingCode,
      },
    },
    parcels: [
      {
        weight: {
          value: weightKg.toFixed(3),
          unit:  "kg",
        },
      },
    ],
    external_reference: order_id,
  };

  const credentials = Buffer.from(`${publicKey}:${secretKey}`).toString("base64");

  // API v3 — endpoint synchronous
  const scRes = await fetch("https://panel.sendcloud.sc/api/v3/shipments/create-and-announce", {
    method:  "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify(shipmentBody),
  });

  const scData = await scRes.json();

  if (!scRes.ok) {
    const errMsg = scData?.message
                ?? scData?.error?.message
                ?? JSON.stringify(scData);
    console.error("Sendcloud v3 error:", errMsg);
    return Response.json({ error: `Sendcloud : ${errMsg}` }, { status: 400 });
  }

  // Récupérer tracking + label depuis la réponse v3
  const parcel         = scData?.parcels?.[0];
  const trackingNumber = parcel?.tracking_number ?? scData?.tracking_number ?? "";
  const labelFile      = parcel?.label_file ?? scData?.label_file ?? "";
  const labelUrl       = labelFile
    ? `data:application/pdf;base64,${labelFile}`
    : parcel?.documents?.[0]?.url ?? "";

  // Mettre à jour la commande
  if (trackingNumber) {
    await supabaseServer
      .from("orders")
      .update({ tracking_number: trackingNumber, shipping_status: "shipped" })
      .eq("id", order_id);
  }

  return Response.json({
    ok:              true,
    tracking_number: trackingNumber,
    label_url:       labelUrl,
    shipment_id:     scData?.id,
  });
}