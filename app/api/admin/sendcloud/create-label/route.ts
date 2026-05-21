import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

const SENDCLOUD_API = "https://panel.sendcloud.sc/api/v3";

// Adresse expéditeur M!LK (Menton)
const FROM_ADDRESS = {
  name:           "M!LK — Essentiels Bebe",
  company_name:   "EKBH",
  address_line_1: "6 Impasse des Cabrolles",
  address_line_2: "",
  postal_code:    "06500",
  city:           "Menton",
  country_code:   "FR",
  phone_number:   "+33745272134",
  email:          "contact@milkbebe.fr",
};

function getBasicAuth() {
  const pub = process.env.SENDCLOUD_PUBLIC_KEY ?? "";
  const sec = process.env.SENDCLOUD_SECRET_KEY ?? "";
  return "Basic " + Buffer.from(`${pub}:${sec}`).toString("base64");
}

/**
 * POST /api/admin/sendcloud/create-label
 * Body: { order_id: string, transporteur?: string }
 *
 * 1. Charge la commande
 * 2. Récupère les shipping options Sendcloud v3 pour ce colis
 * 3. Sélectionne l'option qui correspond au transporteur demandé (par nom)
 * 4. Annonce le colis (= crée + génère étiquette en 1 appel synchrone)
 * 5. Sauvegarde tracking_number + label_url, passe statut à "shipped"
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const { order_id, transporteur } = await req.json();
    if (!order_id) return Response.json({ error: "order_id manquant" }, { status: 400 });

    // 1. Charger la commande
    const { data: order, error: orderErr } = await supabaseServer
      .from("orders").select("*").eq("id", order_id).single();
    if (orderErr || !order) {
      return Response.json({ error: "Commande introuvable" }, { status: 404 });
    }

    const addr = order.shipping_address ?? {};
    if (!addr.line1 || !addr.postal_code || !addr.city) {
      return Response.json({ error: "Adresse de livraison incomplète" }, { status: 400 });
    }

    const weightKg = order.total_weight_g ? Math.max(0.05, order.total_weight_g / 1000) : 0.5;

    const toAddress = {
      name:           (addr.name as string) || order.customer_name || "Client",
      company_name:   (addr.company as string) ?? "",
      address_line_1: (addr.line1   as string) ?? "",
      address_line_2: (addr.line2   as string) ?? "",
      postal_code:    String(addr.postal_code ?? ""),
      city:           String(addr.city ?? ""),
      country_code:   String(addr.country ?? "FR").toUpperCase().slice(0, 2),
      phone_number:   (addr.phone as string) ?? "",
      email:          order.customer_email ?? "",
    };

    const parcel = { weight: { value: weightKg.toFixed(3), unit: "kg" } };

    // 2. Fetch shipping options disponibles pour ce colis
    const optsRes = await fetch(`${SENDCLOUD_API}/fetch-shipping-options`, {
      method:  "POST",
      headers: {
        Authorization:  getBasicAuth(),
        "Content-Type": "application/json",
        Accept:         "application/json",
      },
      body: JSON.stringify({
        from_address: FROM_ADDRESS,
        to_address:   toAddress,
        parcels:      [parcel],
      }),
    });
    const optsData = await optsRes.json();
    if (!optsRes.ok) {
      console.error("Sendcloud fetch-shipping-options error:", optsData);
      return Response.json(
        { error: optsData?.error?.message ?? optsData?.message ?? "Erreur Sendcloud (options de livraison)" },
        { status: 400 }
      );
    }

    const options: any[] = Array.isArray(optsData?.data) ? optsData.data : (Array.isArray(optsData) ? optsData : []);
    if (options.length === 0) {
      return Response.json({ error: "Aucune option de livraison disponible pour ce colis Sendcloud" }, { status: 400 });
    }

    // 3. Match par nom de transporteur (depuis l'UI : "La Poste — Colissimo" ou "Chronopost")
    const carrierLower = String(transporteur ?? "").toLowerCase();
    const wantedKey =
      carrierLower.includes("colissimo")  ? "colissimo"  :
      carrierLower.includes("chronopost") ? "chronopost" :
      carrierLower.includes("la poste")   ? "colissimo"  :
      carrierLower;

    const selected = options.find((o: any) => {
      const carrierName = String(o?.carrier?.name ?? "").toLowerCase();
      const carrierCode = String(o?.carrier?.code ?? "").toLowerCase();
      const optName     = String(o?.name ?? "").toLowerCase();
      return wantedKey && (carrierName.includes(wantedKey) || carrierCode.includes(wantedKey) || optName.includes(wantedKey));
    }) ?? options[0];

    const shippingOptionCode = selected?.shipping_option_code ?? selected?.code ?? null;
    if (!shippingOptionCode) {
      console.error("No shipping_option_code in selected option:", selected);
      return Response.json({ error: "Code transporteur Sendcloud manquant dans la réponse" }, { status: 400 });
    }

    // 4. Announce shipment (synchrone : crée + génère étiquette)
    const announceRes = await fetch(`${SENDCLOUD_API}/shipments/announce`, {
      method:  "POST",
      headers: {
        Authorization:  getBasicAuth(),
        "Content-Type": "application/json",
        Accept:         "application/json",
      },
      body: JSON.stringify({
        from_address: FROM_ADDRESS,
        to_address:   toAddress,
        ship_with:    {
          type:       "shipping_option_code",
          properties: { shipping_option_code: shippingOptionCode },
        },
        parcels: [parcel],
      }),
    });
    const announceData = await announceRes.json();
    if (!announceRes.ok) {
      console.error("Sendcloud announce error:", announceData);
      return Response.json(
        { error: announceData?.error?.message ?? announceData?.message ?? "Erreur Sendcloud lors de l'annonce du colis" },
        { status: 400 }
      );
    }

    // 5. Extraire tracking + label depuis la réponse v3
    const announced = announceData?.data?.parcels?.[0] ?? announceData?.parcels?.[0] ?? null;
    const trackingNumber: string = announced?.tracking_number ?? "";
    const documents: any[] = Array.isArray(announced?.documents) ? announced.documents : [];
    const labelDoc = documents.find(d => d?.type === "label") ?? documents[0];
    const labelUrl: string = labelDoc?.link ?? "";
    const parcelId = announced?.id ?? null;

    // 6. Mettre à jour la commande dans Supabase
    const { error: updateErr } = await supabaseServer
      .from("orders")
      .update({
        shipping_status:     "shipped",
        tracking_number:     trackingNumber || null,
        label_url:           labelUrl       || null,
        sendcloud_parcel_id: parcelId       || null,
        shipped_at:          new Date().toISOString(),
      })
      .eq("id", order_id);
    if (updateErr) {
      console.error("Supabase update error:", updateErr);
      // Ne pas bloquer — l'étiquette est créée
    }

    return Response.json({
      ok:              true,
      tracking_number: trackingNumber,
      label_url:       labelUrl,
      parcel_id:       parcelId,
      shipping_option: selected?.name ?? shippingOptionCode,
    });

  } catch (e: any) {
    console.error("create-label v3 error:", e);
    return Response.json({ error: e.message ?? "Erreur interne" }, { status: 500 });
  }
}
