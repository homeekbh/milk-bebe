import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { order_id, transporteur, customer, items } = await req.json();

  if (!order_id || !customer) {
    return Response.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const publicKey = process.env.SENDCLOUD_PUBLIC_KEY;
  const secretKey = process.env.SENDCLOUD_SECRET_KEY;
  const senderId  = process.env.SENDCLOUD_SENDER_ADDRESS_ID;

  if (!publicKey || !secretKey) {
    return Response.json({ error: "Sendcloud non configuré — clés API manquantes" }, { status: 500 });
  }

  const totalItems = Array.isArray(items)
    ? items.reduce((sum: number, i: any) => sum + (i.quantity ?? 1), 0)
    : 1;
  const weightKg = Math.max(0.5, totalItems * 0.2).toFixed(2);

  const nameParts = (customer.name ?? "").split(" ");
  const lastName  = nameParts.slice(-1)[0] ?? customer.name ?? "";
  const firstName = nameParts.slice(0, -1).join(" ") || lastName;

  // Construire les parcel_items depuis les articles de la commande
  const parcelItems = Array.isArray(items) ? items.map((i: any) => ({
    description:    i.name ?? "Article M!LK",
    quantity:       i.quantity ?? 1,
    weight:         "0.200",
    value:          String(i.price ?? 0),
    hs_code:        "6111",      // Code douanier vêtements bébé
    origin_country: "FR",
    product_id:     String(i.id ?? ""),
    sku:            i.slug ?? "",
  })) : [];

  const parcelBody: any = {
    parcel: {
      name:          `${firstName} ${lastName}`.trim(),
      company_name:  "",
      email:         customer.email ?? "",
      telephone:     "",
      address:       customer.address ?? "",
      house_number:  "",
      city:          customer.city ?? "",
      postal_code:   customer.zip ?? "",
      country:       customer.country ?? "FR",
      weight:        weightKg,
      order_number:  order_id,
      parcel_items:  parcelItems,
      request_label: true,
      apply_shipping_rules: true,  // Sendcloud choisit automatiquement le bon transporteur
    },
  };

  // Ajouter l'adresse expéditeur si disponible
  if (senderId) {
    parcelBody.parcel.sender_address = Number(senderId);
  }

  const credentials = Buffer.from(`${publicKey}:${secretKey}`).toString("base64");

  // Utiliser l'API v2 (v3 nécessite une migration complète du format)
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
    const errMsg = scData?.error?.message
                ?? scData?.message
                ?? JSON.stringify(scData);
    console.error("Sendcloud error:", errMsg);
    return Response.json({ error: `Sendcloud : ${errMsg}` }, { status: 400 });
  }

  const parcel         = scData.parcel;
  const trackingNumber = parcel?.tracking_number ?? "";
  const labelUrl       = parcel?.label?.normal_printer?.[0]
                      ?? parcel?.label?.label_printer
                      ?? "";

  // Mettre à jour la commande avec le numéro de tracking
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
    parcel_id:       parcel?.id,
  });
}