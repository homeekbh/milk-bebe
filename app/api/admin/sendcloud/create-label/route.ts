import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

// On utilise l'API v2 /parcels. L'API v3 /shipments/announce nestait
// to_service_point dans ship_with.properties — Sendcloud v3 a un bug connu
// qui ne propage pas ce champ vers le carrier dans certaines configurations
// (résultat : "A service point is required for the selected shipping method"
// même quand on envoie bien la valeur). En v2, to_service_point vit à la
// racine du parcel et fonctionne de façon fiable.
const SENDCLOUD_PARCELS_API = "https://panel.sendcloud.sc/api/v2/parcels";

// Adresse expéditeur M!LK (Menton) — ASCII safe, sans em-dash ni !
// Sert UNIQUEMENT comme fallback d'adresse pour les modes relais où la
// destination réelle est le service point.
const FROM_ADDRESS = {
  address_line_1: "6 Impasse des Cabrolles",
  postal_code:    "06500",
  city:           "Menton",
  country_code:   "FR",
};

/**
 * Mapping carrier × delivery_type → Sendcloud v2 shipment.id.
 *
 * Source de vérité = panel.sendcloud.sc/settings/shipping/methods qui liste
 * les shipment IDs disponibles pour ton contrat. Les 2 IDs ci-dessous sont
 * ceux confirmés par l'utilisateur ; les autres restent à configurer via
 * env vars SENDCLOUD_SHIPMENT_<CARRIER>_<TYPE> quand on les active.
 */
function getShipmentId(carrier: string, deliveryType: string): number | null {
  const envKey  = `SENDCLOUD_SHIPMENT_${carrier.toUpperCase()}_${deliveryType.toUpperCase()}`;
  const envVal  = process.env[envKey];
  if (envVal && /^\d+$/.test(envVal)) return parseInt(envVal, 10);

  const defaults: Record<string, number> = {
    "mondial_relay:point_relais": 8,
    "colissimo:point_relais":     26,
    // À configurer via env quand les contrats sont activés :
    // "mondial_relay:locker", "mondial_relay:home",
    // "colissimo:home", etc.
  };
  return defaults[`${carrier}:${deliveryType}`] ?? null;
}

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
 * Extrait un message d'erreur lisible depuis la réponse Sendcloud v2.
 * Format v2 typique :
 *   { "error": { "code": 400, "message": "...", "request": "..." } }
 * OU
 *   { "errors": [{ "field": "...", "details": "..." }] }
 */
function extractError(json: any, fallback: string): string {
  if (!json) return fallback;
  if (json.error?.message) return json.error.message;
  if (Array.isArray(json.errors) && json.errors.length > 0) {
    return json.errors.map((e: any) =>
      `${e.field ?? e.source?.pointer ?? "field"}: ${e.details ?? e.message ?? e.detail ?? "?"}`
    ).join(" | ");
  }
  return json?.message ?? fallback;
}

/**
 * POST /api/admin/sendcloud/create-label
 * Body: { order_id: string, transporteur?: string }
 *
 * Flow v2 :
 *   1. Charger commande + valider
 *   2. Construire le body parcel (avec to_service_point À LA RACINE pour PR/Locker)
 *   3. POST /api/v2/parcels avec request_label:true
 *   4. Extraire tracking + label_url depuis parcel.label.normal_printer[0]
 *   5. Persister dans orders (2-step update)
 *   6. Si label_url vide → retry GET /api/v2/parcels/{id} (génération async)
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

    // ⚡️ LOG START — première trace que cette route s'exécute.
    const startSnapshot = {
      build_marker:        "2026-05-23-v2-parcels",
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

    // GARDE-FOU — si un parcel Sendcloud existe déjà, on n'en crée PAS un nouveau.
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

    // Normaliser delivery_type. Les 3 modes possibles : point_relais | locker | home.
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

    // Carrier : order.carrier est la source de vérité (choix client au checkout).
    // Fallback sur le body si la colonne est vide (commandes legacy).
    const carrierFromOrder = String(order.carrier ?? "").toLowerCase();
    const carrierFromBody  = String(transporteur ?? "").toLowerCase();
    const effectiveCarrier =
      carrierFromOrder === "mondial_relay" || carrierFromOrder === "colissimo"
        ? carrierFromOrder
        : carrierFromBody.includes("mondial")   ? "mondial_relay"
        : carrierFromBody.includes("colissimo") || carrierFromBody.includes("poste") ? "colissimo"
        : "colissimo"; // default
    console.log("[sendcloud] carrier resolution:", { from_order: order.carrier, from_body: transporteur, effective: effectiveCarrier });
    console.error("[sendcloud] carrier resolution:", { from_order: order.carrier, from_body: transporteur, effective: effectiveCarrier });

    // Shipment ID Sendcloud v2 — dépend du couple carrier+delivery_type.
    const shipmentId = getShipmentId(effectiveCarrier, deliveryType);
    if (shipmentId === null) {
      return Response.json({
        error: `Aucun shipment_id Sendcloud configuré pour ${effectiveCarrier}/${deliveryType}. Configure SENDCLOUD_SHIPMENT_${effectiveCarrier.toUpperCase()}_${deliveryType.toUpperCase()} dans les env vars Vercel.`,
        hint:  "Récupère l'ID depuis panel.sendcloud.sc → Settings → Shipping methods.",
      }, { status: 400 });
    }
    console.log(`[sendcloud] shipment.id resolved: ${shipmentId} for ${effectiveCarrier}/${deliveryType}`);
    console.error(`[sendcloud] shipment.id resolved: ${shipmentId} for ${effectiveCarrier}/${deliveryType}`);

    // ── 2. Validation adresse client (home uniquement) ──────────────────────
    const addr = order.shipping_address ?? {};
    if (!isRelayMode && (!addr.line1 || !addr.postal_code || !addr.city)) {
      console.error("[sendcloud] Adresse incomplète (mode home):", JSON.stringify(addr));
      return Response.json({ error: "Adresse de livraison incomplète (line1/postal_code/city manquant)" }, { status: 400 });
    }

    // Poids : default 0.250 kg (vêtement bébé bambou typique).
    const weightKg = order.total_weight_g ? Math.max(0.05, order.total_weight_g / 1000) : 0.250;

    // Téléphone : OBLIGATOIRE. Priorité order.customer_phone (saisi au checkout
    // après migration 005). Fallback +33600000000 en dernier recours.
    const phoneNumber =
      String(order.customer_phone ?? addr.phone ?? order.phone ?? "+33600000000").trim() || "+33600000000";
    console.error(`[sendcloud] phone resolved=${phoneNumber}`);

    // Nom destinataire — sanitize pour éviter les rejets carrier sur emojis / !
    const customerName = sanitizeName(addr.name || order.customer_name || "Client");

    // ── 3. Construire le body parcel pour v2 ────────────────────────────────
    // Différence majeure avec v3 : to_service_point vit à la RACINE du parcel,
    // pas dans ship_with.properties.
    const parcelBody: Record<string, any> = {
      name:           customerName,
      // En mode relais, l'adresse est overridée par le service point.
      // On met des valeurs cohérentes par défaut (fallback adresse expéditeur)
      // car certaines validations Sendcloud refusent les champs vides.
      address:        addr.line1       || (isRelayMode ? FROM_ADDRESS.address_line_1 : ""),
      city:           addr.city        || (isRelayMode ? FROM_ADDRESS.city           : ""),
      postal_code:    addr.postal_code || (isRelayMode ? FROM_ADDRESS.postal_code    : ""),
      country:        String(addr.country ?? "FR").toUpperCase().slice(0, 2),
      email:          order.customer_email ?? "",
      telephone:      phoneNumber,
      order_number:   String(order.id ?? "").slice(0, 30),
      weight:         weightKg.toFixed(3),
      request_label:  true,
      shipment: { id: shipmentId },
    };

    // sender_address (entier) — REQUIS par Sendcloud v2 pour identifier
    // l'adresse expéditeur enregistrée dans le panel.
    const senderAddressEnv = process.env.SENDCLOUD_SENDER_ADDRESS_ID;
    if (senderAddressEnv && /^\d+$/.test(senderAddressEnv)) {
      parcelBody.sender_address = parseInt(senderAddressEnv, 10);
    } else {
      console.warn("[sendcloud] ⚠ SENDCLOUD_SENDER_ADDRESS_ID env var manquante — Sendcloud peut rejeter");
    }

    // to_service_point À LA RACINE du parcel (pas dans ship_with), en INTEGER.
    // Uniquement pour point_relais et locker — pas pour home.
    if (isRelayMode && relayId) {
      const numericRelayId = /^\d+$/.test(String(relayId))
        ? parseInt(String(relayId), 10)
        : relayId;
      parcelBody.to_service_point = numericRelayId;
      console.log(`[sendcloud] to_service_point set to: ${numericRelayId} (typeof=${typeof numericRelayId})`);
      console.error(`[sendcloud] to_service_point set to: ${numericRelayId} (typeof=${typeof numericRelayId})`);
    }

    const requestBody = { parcel: parcelBody };
    const requestBodyStr = JSON.stringify(requestBody);
    console.log("[sendcloud:body]",  requestBodyStr);
    console.error("[sendcloud:body]", requestBodyStr);

    // ── 4. POST /api/v2/parcels ─────────────────────────────────────────────
    const createRes = await fetch(SENDCLOUD_PARCELS_API, {
      method:  "POST",
      headers: {
        Authorization:  getBasicAuth(),
        "Content-Type": "application/json",
        Accept:         "application/json",
      },
      body: requestBodyStr,
    });
    const createText = await createRes.text();
    let createJson: any = null;
    try { createJson = JSON.parse(createText); } catch {}

    console.log(`[sendcloud:parcels] HTTP ${createRes.status}`);
    console.error(`[sendcloud:parcels] HTTP ${createRes.status}`);
    console.log("[sendcloud:parcels] response body:", createText.slice(0, 4000));
    console.error("[sendcloud:parcels] response body:", createText.slice(0, 4000));

    if (!createRes.ok) {
      return Response.json({
        error:            extractError(createJson, `Sendcloud /api/v2/parcels HTTP ${createRes.status}`),
        endpoint:         SENDCLOUD_PARCELS_API,
        sendcloud_status: createRes.status,
        sendcloud_body:   createJson,
        sendcloud_raw:    createText.slice(0, 3000),
        payload_sent:     requestBody,
      }, { status: 400 });
    }

    // ── 5. Extraire tracking + label_url depuis la réponse v2 ───────────────
    // Format réponse v2 : { parcel: { id, tracking_number, label: { normal_printer:[...] }, ... } }
    const createdParcel = createJson?.parcel ?? createJson?.data ?? createJson;
    let trackingNumber: string = createdParcel?.tracking_number ?? "";
    let labelUrl: string =
      createdParcel?.label?.normal_printer?.[0] ??
      createdParcel?.label?.label_printer?.[0]  ??
      (Array.isArray(createdParcel?.documents) ? createdParcel.documents.find((d: any) => d?.type === "label")?.link : null) ??
      "";
    const parcelId = createdParcel?.id ?? null;

    console.log(`[sendcloud:parcels] SUCCESS tracking=${trackingNumber || "(pending)"} label=${labelUrl ? "OK" : "MISSING"} parcel_id=${parcelId}`);
    console.error(`[sendcloud:parcels] SUCCESS tracking=${trackingNumber || "(pending)"} label=${labelUrl ? "OK" : "MISSING"} parcel_id=${parcelId}`);

    // ── 5bis. Retry GET v2 si label_url vide ───────────────────────────────
    if (!labelUrl && parcelId) {
      console.error(`[sendcloud:retry] label_url vide pour parcel ${parcelId} — démarrage retry GET v2`);
      for (let attempt = 1; attempt <= 3; attempt++) {
        await new Promise(r => setTimeout(r, 2000));
        try {
          const retryRes = await fetch(`https://panel.sendcloud.sc/api/v2/parcels/${parcelId}`, {
            method:  "GET",
            headers: {
              Authorization: getBasicAuth(),
              Accept:        "application/json",
            },
          });
          const retryText = await retryRes.text();
          let retryJson: any = null;
          try { retryJson = JSON.parse(retryText); } catch {}

          console.error(`[sendcloud:retry ${attempt}/3] HTTP ${retryRes.status}`);

          if (!retryRes.ok) {
            console.error(`[sendcloud:retry ${attempt}/3] body=${retryText.slice(0, 500)}`);
            continue;
          }

          const retryParcel = retryJson?.parcel ?? retryJson?.data ?? retryJson;
          const newTracking = retryParcel?.tracking_number ?? "";
          const newLabel    =
            retryParcel?.label?.normal_printer?.[0] ??
            retryParcel?.label?.label_printer?.[0]  ??
            (Array.isArray(retryParcel?.documents) ? retryParcel.documents.find((d: any) => d?.type === "label")?.link : null) ??
            "";

          if (newLabel) {
            labelUrl = newLabel;
            if (newTracking) trackingNumber = newTracking;
            console.error(`[sendcloud:retry ${attempt}/3] SUCCESS — label récupéré`);
            break;
          } else {
            console.error(`[sendcloud:retry ${attempt}/3] label toujours vide, on continue`);
          }
        } catch (e: any) {
          console.error(`[sendcloud:retry ${attempt}/3] exception:`, e?.message);
        }
      }
    }

    // ── 6. Update Supabase — 2-step pour ne pas tout perdre si une colonne
    //       optionnelle (label_url, sendcloud_parcel_id, shipped_at) manque.
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
      console.warn("[sendcloud] Colonnes optionnelles non disponibles (label_url, sendcloud_parcel_id, shipped_at). Migration ALTER TABLE à exécuter:", updateErr2.message);
    }

    // ── 7. Réponse selon disponibilité du label ─────────────────────────────
    const shippingOption = `${effectiveCarrier}/${deliveryType} (shipment.id=${shipmentId})`;
    if (!labelUrl) {
      return Response.json({
        ok:              true,
        pending:         true,
        tracking_number: trackingNumber,
        label_url:       null,
        parcel_id:       parcelId,
        shipping_option: shippingOption,
        message:         `Colis créé (ID: ${parcelId}) — étiquette en cours, réessayer dans 30 secondes`,
      });
    }

    return Response.json({
      ok:              true,
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
