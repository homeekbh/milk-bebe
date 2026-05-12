import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

// Mapping transporteur M!LK → code Sendcloud
const CARRIER_MAP: Record<string, { name: string; code: string }> = {
  "La Poste — Colissimo": { name: "Colissimo",   code: "colissimo"   },
  "Chronopost":           { name: "Chronopost",   code: "chronopost"  },
  "DHL":                  { name: "DHL",           code: "dhl"         },
  "UPS":                  { name: "UPS",           code: "ups"         },
  "Mondial Relay":        { name: "Mondial Relay", code: "mondial_relay" },
  "TNT":                  { name: "TNT",           code: "tnt"         },
};

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { order_id, transporteur, customer, items } = await req.json();

  if (!order_id || !transporteur || !customer) {
    return Response.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const publicKey  = process.env.SENDCLOUD_PUBLIC_KEY;
  const secretKey  = process.env.SENDCLOUD_SECRET_KEY;
  const senderId   = process.env.SENDCLOUD_SENDER_ADDRESS_ID;

  if (!publicKey || !secretKey) {
    return Response.json({ error: "Sendcloud non configuré — clés API manquantes" }, { status: 500 });
  }

  const carrier = CARRIER_MAP[transporteur] ?? { name: transporteur, code: "colissimo" };

  // Calculer le poids total estimé (200g par article par défaut)
  const totalItems = Array.isArray(items)
    ? items.reduce((sum: number, i: any) => sum + (i.quantity ?? 1), 0)
    : 1;
  const weightKg = Math.max(0.5, totalItems * 0.2);

  // Construire le nom du destinataire
  const nameParts = (customer.name ?? "").split(" ");
  const lastName  = nameParts.slice(-1)[0] ?? customer.name ?? "";
  const firstName = nameParts.slice(0, -1).join(" ") || lastName;

  const parcelBody = {
    parcel: {
      name:           firstName,
      company_name:   "",
      address:        customer.address ?? "",
      city:           customer.city ?? "",
      postal_code:    customer.zip ?? "",
      country:        { iso_2: customer.country ?? "FR" },
      email:          customer.email ?? "",
      telephone:      "",
      weight:         String(weightKg),
      order_number:   order_id,
      shipment: {
        id:   8,        // Sendcloud shipment type id (8 = standard)
        name: carrier.name,
      },
      ...(senderId ? { sender_address: Number(senderId) } : {}),
      request_label:  true,
    },
  };

  const credentials = Buffer.from(`${publicKey}:${secretKey}`).toString("base64");

  const scRes = await fetch("https://panel.sendcloud.sc/api/v2/parcels", {
    method:  "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify(parcelBody),
  });

  const scData = await scRes.json();

  if (!scRes.ok) {
    const errMsg = scData?.error?.message ?? scData?.message ?? JSON.stringify(scData);
    console.error("Sendcloud error:", errMsg);
    return Response.json({ error: `Sendcloud : ${errMsg}` }, { status: 400 });
  }

  const parcel        = scData.parcel;
  const trackingNumber = parcel?.tracking_number ?? "";
  const labelUrl       = parcel?.label?.normal_printer?.[0] ?? parcel?.label?.label_printer ?? "";

  // Mettre à jour la commande avec le numéro de tracking
  if (trackingNumber) {
    await supabaseServer
      .from("orders")
      .update({
        tracking_number:  trackingNumber,
        shipping_status:  "shipped",
      })
      .eq("id", order_id);
  }

  return Response.json({
    ok:              true,
    tracking_number: trackingNumber,
    label_url:       labelUrl,
    parcel_id:       parcel?.id,
  });
}