import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

// API v3 Sendcloud — host api.sendcloud.sc (différent de panel.sendcloud.sc).
// Flow en 2 étapes : fetch-shipping-options puis shipments/announce.
const SENDCLOUD_V3_API = "https://api.sendcloud.sc/api/v3";

function getBasicAuth() {
  const pub = process.env.SENDCLOUD_PUBLIC_KEY ?? "";
  const sec = process.env.SENDCLOUD_SECRET_KEY ?? "";
  return "Basic " + Buffer.from(`${pub}:${sec}`).toString("base64");
}

/**
 * Nettoie un nom pour passer la validation carrier :
 * - remplace em-dash, en-dash, tirets exotiques par "-"
 * - retire les ! et autres caractères de ponctuation forte
 */
function sanitizeName(s: string): string {
  return String(s ?? "")
    .replace(/[—–]/g, "-")
    .replace(/[!@#$%^&*<>{}[\]\\|`~]/g, "")
    .trim()
    .slice(0, 75);
}

/**
 * Extrait un message d'erreur lisible depuis la réponse Sendcloud v3.
 * Format v3 typique :
 *   { "errors": [{ "source": { "pointer": "..." }, "detail": "...", "title": "..." }] }
 *   { "error": { "code": 400, "message": "..." } }
 */
function extractError(json: any, fallback: string): string {
  if (!json) return fallback;
  if (Array.isArray(json.errors) && json.errors.length > 0) {
    return json.errors.map((e: any) => {
      const pointer = e?.source?.pointer ? ` [${e.source.pointer}]` : "";
      return `${e?.detail ?? e?.title ?? "Erreur"}${pointer}`;
    }).join(" | ");
  }
  if (json.error?.message) return json.error.message;
  return json?.message ?? fallback;
}

/**
 * Sélectionne le bon shipping_option_code dans la liste retournée par
 * /fetch-shipping-options selon carrier + delivery_type.
 *
 * Logique :
 *   - colissimo + point_relais  → contient "colissimo" ET "service_point"
 *   - colissimo + home          → contient "colissimo" SANS "service_point"
 *   - mondial_relay + point_relais → contient "mondial_relay" ET "service_point"
 *   - mondial_relay + locker    → contient "mondial_relay" ET "locker"
 *   - mondial_relay + home      → contient "mondial_relay" SANS "service_point" SANS "locker"
 */
function pickShippingOption(options: any[], carrier: string, deliveryType: string): any | null {
  if (!Array.isArray(options) || options.length === 0) return null;

  const carrierKey = carrier.toLowerCase().includes("mondial") ? "mondial_relay" : "colissimo";

  const matches = (o: any, predicate: (blob: string) => boolean): boolean => {
    const name = String(o?.name ?? "").toLowerCase();
    const code = String(o?.code ?? o?.shipping_option_code ?? "").toLowerCase();
    const carrierName = String(o?.carrier?.name ?? "").toLowerCase();
    const carrierCode = String(o?.carrier?.code ?? "").toLowerCase();
    return predicate(`${name} ${code} ${carrierName} ${carrierCode}`);
  };

  const hasCarrier = (blob: string) => blob.includes(carrierKey) || blob.includes(carrierKey.replace("_", " ")) || blob.includes(carrierKey.replace("_", ""));
  const hasServicePoint = (blob: string) => /service[_ -]?point|point[_ -]?relais/.test(blob);
  const hasLocker = (blob: string) => /locker|consigne/.test(blob);

  if (deliveryType === "point_relais") {
    return options.find(o => matches(o, b => hasCarrier(b) && hasServicePoint(b)))
        ?? options.find(o => matches(o, b => hasCarrier(b) && !hasLocker(b) && hasServicePoint(b)))
        ?? null;
  }
  if (deliveryType === "locker") {
    return options.find(o => matches(o, b => hasCarrier(b) && hasLocker(b))) ?? null;
  }
  // home
  return options.find(o => matches(o, b => hasCarrier(b) && !hasServicePoint(b) && !hasLocker(b)))
      ?? options.find(o => matches(o, b => hasCarrier(b))) // fallback : 1er du carrier
      ?? null;
}

/**
 * POST /api/admin/sendcloud/create-label
 * Body: { order_id: string, transporteur?: string }
 *
 * Flow v3 (api.sendcloud.sc) :
 *   1. Charger commande + valider
 *   2. POST /api/v3/fetch-shipping-options → liste des options dispos
 *   3. Sélectionner le bon shipping_option_code selon carrier + delivery_type
 *   4. POST /api/v3/shipments/announce avec to_service_point: { id: N } pour PR/locker
 *   5. Extraire tracking + label_url depuis shipments[0].label.normal_printer[0]
 *   6. Persister dans orders (2-step update)
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

    const startSnapshot = {
      build_marker:        "2026-05-23-v3-api-sendcloud",
      order_id:            order.id,
      relay_id:            order.relay_id,
      relay_name:          order.relay_name,
      delivery_type:       order.delivery_type,
      carrier:             order.carrier,
      sendcloud_parcel_id: order.sendcloud_parcel_id,
      shipping_status:     order.shipping_status,
      customer_phone:      order.customer_phone,
    };
    console.log("[sendcloud:START]",  JSON.stringify(startSnapshot));
    console.error("[sendcloud:START]", JSON.stringify(startSnapshot));

    // GARDE-FOU contre double création
    if (order.sendcloud_parcel_id) {
      const force = req.headers.get("x-force-recreate") === "true";
      if (!force) {
        return Response.json({
          error:     "Un colis Sendcloud existe déjà pour cette commande.",
          parcel_id: order.sendcloud_parcel_id,
          hint:      "Utilise 'Vérifier l'étiquette' pour récupérer le PDF. Si tu veux vraiment recréer (rare), renvoie la requête avec l'en-tête x-force-recreate: true.",
        }, { status: 409 });
      }
      console.error(`[sendcloud:create-label] FORCE_RECREATE — un parcel ${order.sendcloud_parcel_id} existait déjà pour ${order_id}`);
    }

    // Normaliser delivery_type
    const rawDeliveryType = order.delivery_type as (string | null);
    const deliveryType: "point_relais" | "locker" | "home" | null =
      rawDeliveryType === "point_relais" ? "point_relais" :
      rawDeliveryType === "locker"       ? "locker"       :
      rawDeliveryType === "home"         ? "home"         :
      null;

    if (!deliveryType) {
      return Response.json({ error: `delivery_type invalide ou manquant: ${rawDeliveryType ?? "(null)"}` }, { status: 400 });
    }

    const relayId      = order.relay_id as (string | null);
    const isRelayMode  = deliveryType === "point_relais" || deliveryType === "locker";

    if (isRelayMode && !relayId) {
      return Response.json({ error: "Point relais / locker manquant — saisie manuelle requise dans la commande" }, { status: 400 });
    }

    // Carrier : order.carrier prioritaire (source de vérité), fallback body
    const carrierFromOrder = String(order.carrier ?? "").toLowerCase();
    const carrierFromBody  = String(transporteur ?? "").toLowerCase();
    const effectiveCarrier: "mondial_relay" | "colissimo" =
      carrierFromOrder === "mondial_relay" || carrierFromOrder === "colissimo"
        ? carrierFromOrder
        : carrierFromBody.includes("mondial")   ? "mondial_relay"
        : carrierFromBody.includes("colissimo") || carrierFromBody.includes("poste") ? "colissimo"
        : "colissimo";
    console.log("[sendcloud] carrier:", { from_order: order.carrier, from_body: transporteur, effective: effectiveCarrier });
    console.error("[sendcloud] carrier:", { from_order: order.carrier, from_body: transporteur, effective: effectiveCarrier });

    // ── 2. Préparer données communes ────────────────────────────────────────
    const senderAddressEnv = process.env.SENDCLOUD_SENDER_ADDRESS_ID;
    if (!senderAddressEnv || !/^\d+$/.test(senderAddressEnv)) {
      return Response.json({
        error: "SENDCLOUD_SENDER_ADDRESS_ID manquant ou invalide. Configure-le dans Vercel → Settings → Env Vars (entier).",
      }, { status: 500 });
    }
    const senderAddressId = parseInt(senderAddressEnv, 10);

    const addr = order.shipping_address ?? {};
    if (!isRelayMode && (!addr.line1 || !addr.postal_code || !addr.city)) {
      console.error("[sendcloud] Adresse incomplète (mode home):", JSON.stringify(addr));
      return Response.json({ error: "Adresse de livraison incomplète (line1/postal_code/city manquant)" }, { status: 400 });
    }

    const weightKg = order.total_weight_g ? Math.max(0.05, order.total_weight_g / 1000) : 0.250;
    const phoneNumber = String(order.customer_phone ?? addr.phone ?? order.phone ?? "+33600000000").trim() || "+33600000000";
    const customerName = sanitizeName(addr.name || order.customer_name || "Client");
    const numericRelayId = relayId && /^\d+$/.test(String(relayId)) ? parseInt(String(relayId), 10) : null;

    // Postal code pour fetch-shipping-options : relay_postal_code en relais, sinon
    // postal_code client (Sendcloud calcule le service point le plus proche).
    const fetchPostalCode = isRelayMode
      ? (order.relay_postal_code || addr.postal_code || "06500")
      : (addr.postal_code || "06500");
    const fetchCountry = String(addr.country ?? "FR").toUpperCase().slice(0, 2);

    // ── 3. POST /api/v3/fetch-shipping-options ──────────────────────────────
    const optionsBody: Record<string, any> = {
      from_address: { id: senderAddressId },
      to_address:   { country_iso_2: fetchCountry, postal_code: fetchPostalCode },
      weight:       { value: 0.250, unit: "kg" },
    };
    if (numericRelayId) {
      optionsBody.to_service_point = numericRelayId;
    }

    const optionsBodyStr = JSON.stringify(optionsBody);
    console.log("[sendcloud:v3:options:body]",  optionsBodyStr);
    console.error("[sendcloud:v3:options:body]", optionsBodyStr);

    const optionsRes = await fetch(`${SENDCLOUD_V3_API}/fetch-shipping-options`, {
      method:  "POST",
      headers: {
        Authorization:  getBasicAuth(),
        "Content-Type": "application/json",
        Accept:         "application/json",
      },
      body: optionsBodyStr,
    });
    const optionsText = await optionsRes.text();
    let optionsJson: any = null;
    try { optionsJson = JSON.parse(optionsText); } catch {}

    console.log(`[sendcloud:v3:options] HTTP ${optionsRes.status}`);
    console.error(`[sendcloud:v3:options] HTTP ${optionsRes.status}`);
    console.log("[sendcloud:v3:options] response:", optionsText.slice(0, 4000));
    console.error("[sendcloud:v3:options] response:", optionsText.slice(0, 4000));

    if (!optionsRes.ok) {
      return Response.json({
        error:            extractError(optionsJson, `Sendcloud /fetch-shipping-options HTTP ${optionsRes.status}`),
        endpoint:         `${SENDCLOUD_V3_API}/fetch-shipping-options`,
        sendcloud_status: optionsRes.status,
        sendcloud_body:   optionsJson,
        sendcloud_raw:    optionsText.slice(0, 3000),
        payload_sent:     optionsBody,
      }, { status: 400 });
    }

    const allOptions: any[] = Array.isArray(optionsJson?.data)
      ? optionsJson.data
      : Array.isArray(optionsJson) ? optionsJson : [];

    if (allOptions.length === 0) {
      return Response.json({
        error: "Aucune option de livraison Sendcloud disponible pour ce colis",
        sendcloud_body: optionsJson,
        payload_sent: optionsBody,
      }, { status: 400 });
    }

    console.log(`[sendcloud:v3:options] ${allOptions.length} options trouvées, codes:`,
      allOptions.map((o: any) => o.code ?? o.shipping_option_code).filter(Boolean).join(" | "));

    // ── 4. Choisir le bon shipping_option_code ──────────────────────────────
    const selected = pickShippingOption(allOptions, effectiveCarrier, deliveryType);
    if (!selected) {
      return Response.json({
        error: `Aucune option Sendcloud trouvée pour ${effectiveCarrier}/${deliveryType}. Vérifie que ton contrat Sendcloud inclut cette combinaison.`,
        available_codes: allOptions.map((o: any) => o.code ?? o.shipping_option_code).filter(Boolean),
      }, { status: 400 });
    }
    const shippingOptionCode = selected.code ?? selected.shipping_option_code;
    console.log(`[sendcloud:v3:options] SELECTED code=${shippingOptionCode} name=${selected.name}`);
    console.error(`[sendcloud:v3:options] SELECTED code=${shippingOptionCode} name=${selected.name}`);

    // ── 5. POST /api/v3/shipments/announce ──────────────────────────────────
    const shipmentObj: Record<string, any> = {
      shipping_option_code: shippingOptionCode,
      from_address:         { id: senderAddressId },
      to_address: {
        name:           customerName,
        address_line_1: addr.line1 || "",
        city:           addr.city || "",
        postal_code:    addr.postal_code || fetchPostalCode,
        country_iso_2:  fetchCountry,
        email:          order.customer_email ?? "",
        phone_number:   phoneNumber,
      },
      parcels:      [{ weight: { value: 0.250, unit: "kg" } }],
      order_number: String(order.id ?? "").slice(0, 30),
      request_label: true,
    };
    if (numericRelayId) {
      shipmentObj.to_service_point = { id: numericRelayId };
    }

    const announceBody = { shipments: [shipmentObj] };
    const announceBodyStr = JSON.stringify(announceBody);
    console.log("[sendcloud:v3:body]",  announceBodyStr);
    console.error("[sendcloud:v3:body]", announceBodyStr);

    const announceRes = await fetch(`${SENDCLOUD_V3_API}/shipments/announce`, {
      method:  "POST",
      headers: {
        Authorization:  getBasicAuth(),
        "Content-Type": "application/json",
        Accept:         "application/json",
      },
      body: announceBodyStr,
    });
    const announceText = await announceRes.text();
    let announceJson: any = null;
    try { announceJson = JSON.parse(announceText); } catch {}

    console.log(`[sendcloud:v3:response] HTTP ${announceRes.status}`);
    console.error(`[sendcloud:v3:response] HTTP ${announceRes.status}`);
    console.log("[sendcloud:v3:response] body:", announceText.slice(0, 4000));
    console.error("[sendcloud:v3:response] body:", announceText.slice(0, 4000));

    if (!announceRes.ok) {
      return Response.json({
        error:            extractError(announceJson, `Sendcloud /shipments/announce HTTP ${announceRes.status}`),
        endpoint:         `${SENDCLOUD_V3_API}/shipments/announce`,
        sendcloud_status: announceRes.status,
        sendcloud_body:   announceJson,
        sendcloud_raw:    announceText.slice(0, 3000),
        payload_sent:     announceBody,
      }, { status: 400 });
    }

    // ── 6. Extraire tracking + label_url ────────────────────────────────────
    // Format v3 : { shipments: [{ id, tracking_number, label: { normal_printer: [...] }, ... }] }
    const shipments = Array.isArray(announceJson?.shipments) ? announceJson.shipments :
                      Array.isArray(announceJson?.data)      ? announceJson.data      :
                      [];
    const shipment = shipments[0] ?? null;

    if (!shipment) {
      return Response.json({
        error: "Réponse Sendcloud sans shipment — format inattendu",
        sendcloud_body: announceJson,
      }, { status: 500 });
    }

    let trackingNumber: string = shipment?.tracking_number ?? "";
    let labelUrl: string =
      shipment?.label?.normal_printer?.[0] ??
      shipment?.label?.label_printer?.[0]  ??
      (Array.isArray(shipment?.documents) ? shipment.documents.find((d: any) => d?.type === "label")?.link : null) ??
      "";
    const parcelId = shipment?.id ?? shipment?.parcels?.[0]?.id ?? null;

    console.log(`[sendcloud:v3:response] SUCCESS tracking=${trackingNumber || "(pending)"} label=${labelUrl ? "OK" : "MISSING"} parcel_id=${parcelId}`);
    console.error(`[sendcloud:v3:response] SUCCESS tracking=${trackingNumber || "(pending)"} label=${labelUrl ? "OK" : "MISSING"} parcel_id=${parcelId}`);

    // ── 7. Update Supabase (2-step) ─────────────────────────────────────────
    const { error: updateErr1 } = await supabaseServer
      .from("orders")
      .update({
        shipping_status: "expediee",
        tracking_number: trackingNumber || null,
      })
      .eq("id", order_id);
    if (updateErr1) console.error("[sendcloud] Supabase update statut/tracking:", updateErr1);

    const { error: updateErr2 } = await supabaseServer
      .from("orders")
      .update({
        label_url:           labelUrl || null,
        sendcloud_parcel_id: parcelId || null,
        shipped_at:          new Date().toISOString(),
      })
      .eq("id", order_id);
    if (updateErr2) {
      console.warn("[sendcloud] Colonnes optionnelles non disponibles:", updateErr2.message);
    }

    // ── 8. Réponse ──────────────────────────────────────────────────────────
    const shippingOption = `${effectiveCarrier}/${deliveryType} (${shippingOptionCode})`;
    if (!labelUrl) {
      return Response.json({
        ok:              true,
        pending:         true,
        success:         true,
        tracking_number: trackingNumber,
        label_url:       null,
        parcel_id:       parcelId,
        shipping_option: shippingOption,
        message:         `Colis créé (ID: ${parcelId}) — étiquette en cours, réessayer dans 30 secondes`,
      });
    }

    return Response.json({
      ok:              true,
      success:         true,
      tracking_number: trackingNumber,
      label_url:       labelUrl,
      parcel_id:       parcelId,
      shipping_option: shippingOption,
    });

  } catch (e: any) {
    console.error("[sendcloud] create-label exception:", e);
    return Response.json({ error: e.message ?? "Erreur interne" }, { status: 500 });
  }
}
