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
  house_number:   "6",
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
 * Essaie d'extraire le numéro de rue depuis address_line_1.
 * Ex: "10 Rue de Paris" → "10" / "Avenue Hugo, 5" → "5"
 */
function extractHouseNumber(line: string): string {
  if (!line) return "";
  const m = String(line).match(/\b\d+\s*[a-zA-Z]?\b/);
  return m ? m[0].trim() : "";
}

/**
 * Log compact d'une réponse fetch — status + body brut pour debug Vercel.
 */
async function logSendcloudCall(label: string, res: Response): Promise<any> {
  const status = res.status;
  const text   = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch {}

  console.log(`[sendcloud:${label}] status=${status}`);
  console.log(`[sendcloud:${label}] body=${text.slice(0, 4000)}${text.length > 4000 ? "…(truncated)" : ""}`);

  return { status, ok: res.ok, json, text };
}

/**
 * POST /api/admin/sendcloud/create-label
 * Body: { order_id: string, transporteur?: string }
 *
 * Flow v3 : fetch-shipping-options → shipments/announce (sync)
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const { order_id, transporteur } = await req.json();
    if (!order_id) return Response.json({ error: "order_id manquant" }, { status: 400 });

    // ── 1. Charger la commande ──────────────────────────────────────────────
    const { data: order, error: orderErr } = await supabaseServer
      .from("orders").select("*").eq("id", order_id).single();
    if (orderErr || !order) {
      return Response.json({ error: "Commande introuvable" }, { status: 404 });
    }

    const addr = order.shipping_address ?? {};
    if (!addr.line1 || !addr.postal_code || !addr.city) {
      console.error("[sendcloud] Adresse incomplète:", addr);
      return Response.json({ error: "Adresse de livraison incomplète (line1/postal_code/city manquant)" }, { status: 400 });
    }

    const weightKg = order.total_weight_g ? Math.max(0.05, order.total_weight_g / 1000) : 0.5;

    const toAddress = {
      name:           (addr.name as string) || order.customer_name || "Client",
      company_name:   (addr.company as string) ?? "",
      address_line_1: (addr.line1   as string) ?? "",
      address_line_2: (addr.line2   as string) ?? "",
      house_number:   extractHouseNumber((addr.line1 as string) ?? ""),
      postal_code:    String(addr.postal_code ?? ""),
      city:           String(addr.city ?? ""),
      country_code:   String(addr.country ?? "FR").toUpperCase().slice(0, 2),
      phone_number:   (addr.phone as string) ?? "",
      email:          order.customer_email ?? "",
    };

    const parcel = { weight: { value: weightKg.toFixed(3), unit: "kg" } };

    console.log(`[sendcloud] === REQUEST order=${order_id} transporteur="${transporteur}" weight=${weightKg}kg ===`);
    console.log(`[sendcloud] to=${toAddress.city}/${toAddress.postal_code}/${toAddress.country_code}`);

    // ── 2. Fetch shipping options ───────────────────────────────────────────
    const optsBody = {
      from_address: FROM_ADDRESS,
      to_address:   toAddress,
      parcels:      [parcel],
    };
    console.log(`[sendcloud:fetch-options] payload=${JSON.stringify(optsBody)}`);

    const optsRes = await fetch(`${SENDCLOUD_API}/fetch-shipping-options`, {
      method:  "POST",
      headers: {
        Authorization:  getBasicAuth(),
        "Content-Type": "application/json",
        Accept:         "application/json",
      },
      body: JSON.stringify(optsBody),
    });
    const optsLog = await logSendcloudCall("fetch-options", optsRes);
    if (!optsLog.ok) {
      return Response.json(
        {
          error: optsLog.json?.error?.message ?? optsLog.json?.message ?? `Sendcloud /fetch-shipping-options HTTP ${optsLog.status}`,
          sendcloud_status: optsLog.status,
          sendcloud_body:   optsLog.json ?? optsLog.text?.slice(0, 1000),
        },
        { status: 400 }
      );
    }

    const optsData = optsLog.json;
    const options: any[] = Array.isArray(optsData?.data) ? optsData.data : (Array.isArray(optsData) ? optsData : []);
    console.log(`[sendcloud:fetch-options] count=${options.length}`);
    if (options.length === 0) {
      return Response.json({ error: "Aucune option de livraison disponible pour ce colis Sendcloud" }, { status: 400 });
    }

    // Liste de codes dispo pour debug
    const sampleCodes = options.slice(0, 5).map((o: any) => ({
      code:     o.shipping_option_code ?? o.code,
      carrier:  o.carrier?.name ?? o.carrier?.code,
      contract: o.contract?.id ?? o.contract_id,
      name:     o.name,
    }));
    console.log(`[sendcloud:fetch-options] sample=${JSON.stringify(sampleCodes)}`);

    // ── 3. Match par nom de transporteur ─────────────────────────────────────
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
      const optCode     = String(o?.shipping_option_code ?? o?.code ?? "").toLowerCase();
      return wantedKey && (
        carrierName.includes(wantedKey) ||
        carrierCode.includes(wantedKey) ||
        optName.includes(wantedKey)     ||
        optCode.includes(wantedKey)
      );
    }) ?? options[0];

    const shippingOptionCode = selected?.shipping_option_code ?? selected?.code ?? null;
    const contractId         = selected?.contract?.id ?? selected?.contract_id ?? null;

    console.log(`[sendcloud] selected option: code=${shippingOptionCode} contract=${contractId} carrier=${selected?.carrier?.name}`);

    if (!shippingOptionCode) {
      console.error("[sendcloud] No shipping_option_code in selected option:", selected);
      return Response.json({ error: "Code transporteur Sendcloud manquant dans la réponse" }, { status: 400 });
    }

    // ── 4. Announce shipment (sync) ──────────────────────────────────────────
    const announceBody: any = {
      label_details: { mime_type: "application/pdf", dpi: 72 },
      from_address:  FROM_ADDRESS,
      to_address:    toAddress,
      ship_with:     {
        type:       "shipping_option_code",
        properties: {
          shipping_option_code: shippingOptionCode,
          ...(contractId ? { contract_id: contractId } : {}),
        },
      },
      order_number: String(order.id ?? "").slice(0, 30),
      parcels:      [parcel],
    };
    console.log(`[sendcloud:announce] payload=${JSON.stringify(announceBody)}`);

    const announceRes = await fetch(`${SENDCLOUD_API}/shipments/announce`, {
      method:  "POST",
      headers: {
        Authorization:  getBasicAuth(),
        "Content-Type": "application/json",
        Accept:         "application/json",
      },
      body: JSON.stringify(announceBody),
    });
    const announceLog = await logSendcloudCall("announce", announceRes);
    if (!announceLog.ok) {
      return Response.json(
        {
          error: announceLog.json?.error?.message ?? announceLog.json?.message ?? `Sendcloud /shipments/announce HTTP ${announceLog.status}`,
          sendcloud_status: announceLog.status,
          sendcloud_body:   announceLog.json ?? announceLog.text?.slice(0, 1000),
        },
        { status: 400 }
      );
    }

    // ── 5. Extraire tracking + label ─────────────────────────────────────────
    const announceData = announceLog.json;
    const announced = announceData?.data?.parcels?.[0] ?? announceData?.parcels?.[0] ?? null;
    const trackingNumber: string = announced?.tracking_number ?? "";
    const documents: any[] = Array.isArray(announced?.documents) ? announced.documents : [];
    const labelDoc = documents.find(d => d?.type === "label") ?? documents[0];
    const labelUrl: string = labelDoc?.link ?? "";
    const parcelId = announced?.id ?? null;

    console.log(`[sendcloud:announce] success tracking=${trackingNumber} label=${labelUrl ? "OK" : "MISSING"}`);

    // ── 6. Update Supabase ───────────────────────────────────────────────────
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
    if (updateErr) console.error("[sendcloud] Supabase update error:", updateErr);

    return Response.json({
      ok:              true,
      tracking_number: trackingNumber,
      label_url:       labelUrl,
      parcel_id:       parcelId,
      shipping_option: selected?.name ?? shippingOptionCode,
    });

  } catch (e: any) {
    console.error("[sendcloud] create-label exception:", e);
    return Response.json({ error: e.message ?? "Erreur interne" }, { status: 500 });
  }
}
