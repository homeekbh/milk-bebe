import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

// API v3 Sendcloud — host panel.sendcloud.sc (les endpoints v3 y sont exposés
// sous /api/v3/...). Flow en 2 étapes : fetch-shipping-options puis
// shipments/announce.
const SENDCLOUD_V3_API = "https://panel.sendcloud.sc/api/v3";

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
 * Mapping hardcodé carrier × delivery_type → shipping_option_code exact
 * confirmé sur ce compte Sendcloud (via /fetch-shipping-options).
 *
 * Important :
 *   - "colissimo:post-office" est le code "Colissimo Service Point" / Bureau
 *     de Poste sur ce compte. Sendcloud route automatiquement vers le point
 *     relais le plus proche via le postal_code — ON N'ENVOIE PAS
 *     to_service_point pour ce code (cf. CODES_WITHOUT_SERVICE_POINT).
 *   - "colissimo:home/fr" pour la livraison domicile domestique FR.
 *   - "mondial_relay:service_point,dualapi/size=l,c2c" pour Mondial Relay
 *     PR — accepte to_service_point.id.
 *
 * Configurable via env vars SENDCLOUD_OPTION_CODE_<CARRIER>_<TYPE> si
 * Sendcloud renomme/désactive un code sur le contrat.
 */
const SENDCLOUD_OPTION_CODES: Record<string, Record<string, string>> = {
  colissimo: {
    point_relais: "colissimo:post-office",
    home:         "colissimo:home/fr",
  },
  mondial_relay: {
    point_relais: "mondial_relay:service_point,dualapi/size=l,c2c",
    home:         "mondial_relay:home_domestic,dualapi/c2c",
    // locker : non confirmé sur ce compte — à ajouter quand activé
  },
};

// Codes qui n'acceptent PAS to_service_point dans le body announce.
// Vide pour l'instant : "colissimo:post-office" exige bien
// to_service_point (testé en prod, Sendcloud refuse sinon avec
// "A service point is required for the selected shipping method").
// À remplir si on rencontre des codes qui rejettent to_service_point.
const CODES_WITHOUT_SERVICE_POINT = new Set<string>([]);

function pickShippingOption(
  options: any[],
  carrier: string,
  deliveryType: string,
): { selected: any | null; expectedCode: string | null } {
  const carrierKey = carrier.toLowerCase().includes("mondial") ? "mondial_relay" : "colissimo";

  // Override env var prioritaire
  const envKey = `SENDCLOUD_OPTION_CODE_${carrierKey.toUpperCase()}_${deliveryType.toUpperCase()}`;
  const envCode = process.env[envKey];

  const expectedCode = envCode || SENDCLOUD_OPTION_CODES[carrierKey]?.[deliveryType] || null;
  if (!expectedCode) {
    return { selected: null, expectedCode: null };
  }

  // Cherche dans la liste retournée par Sendcloud. Si le code exact y est,
  // on retourne l'objet correspondant (pour récupérer son `.name`).
  // Sinon, on retourne un stub minimal — le code sera quand même envoyé
  // à announce (Sendcloud validera de son côté).
  const found = Array.isArray(options)
    ? options.find(o => (o?.code ?? o?.shipping_option_code) === expectedCode)
    : null;

  return {
    selected: found ?? { code: expectedCode, name: expectedCode, _from: "hardcoded_mapping" },
    expectedCode,
  };
}

/**
 * POST /api/admin/sendcloud/create-label
 * Body: { order_id: string, transporteur?: string }
 *
 * Flow v3 (panel.sendcloud.sc) :
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

    // Poids final envoyé à Sendcloud :
    //   - announce.parcels[].weight = poids réel de la commande
    //     (order.total_weight_g / 1000), fallback 0.250 kg.
    //   - fetch-shipping-options.weight = 0.250 hardcodé pour récupérer
    //     TOUTES les options disponibles incluant les petites tranches
    //     (colissimo:post-office en tranche 0-0.25 kg sur ce compte).
    const weightKg = order.total_weight_g ? Math.max(0.05, order.total_weight_g / 1000) : 0.250;
    const weightKgStr = weightKg.toFixed(3);
    const fetchWeightKg = 0.250; // hardcoded pour fetch-shipping-options
    console.log("[sendcloud:weight]", JSON.stringify({
      source_g:           order.total_weight_g,
      announce_kg:        weightKg,
      announce_str:       weightKgStr,
      fetch_options_kg:   fetchWeightKg,
    }));
    const phoneNumber = String(order.customer_phone ?? addr.phone ?? order.phone ?? "+33600000000").trim() || "+33600000000";
    const customerName = sanitizeName(addr.name || order.customer_name || "Client");
    const numericRelayId = relayId && /^\d+$/.test(String(relayId)) ? parseInt(String(relayId), 10) : null;

    // Adresse destinataire : SOURCE différente selon le mode.
    //
    // Mode PR/Locker : le client a sélectionné un point relais — c'est l'adresse
    // du RELAIS qu'on doit envoyer à Sendcloud, stockée dans les colonnes
    // relay_address / relay_city / relay_postal_code (pas dans shipping_address
    // qui est laissé vide au checkout en mode relais).
    //
    // Mode Home : adresse saisie au checkout dans shipping_address (JSONB).
    const recipientAddressLine1 = isRelayMode
      ? String(order.relay_address ?? "")
      : String(addr.line1 ?? "");
    const recipientCity = isRelayMode
      ? String(order.relay_city ?? "")
      : String(addr.city ?? "");
    const recipientPostalCode = isRelayMode
      ? String(order.relay_postal_code ?? "")
      : String(addr.postal_code ?? "");
    const recipientCountry = String(addr.country ?? "FR").toUpperCase().slice(0, 2);

    // Log explicite pour diagnostiquer les sources d'adresse
    console.log("[sendcloud:address]", JSON.stringify({
      isRelayMode,
      source:             isRelayMode ? "relay_* columns" : "shipping_address JSON",
      recipientName:      customerName,
      address_line_1:     recipientAddressLine1,
      city:               recipientCity,
      postal_code:        recipientPostalCode,
      country_iso_2:      recipientCountry,
      phone:              phoneNumber,
      // Sources brutes pour vérif :
      relay_address:      order.relay_address,
      relay_city:         order.relay_city,
      relay_postal_code:  order.relay_postal_code,
      shipping_address:   addr,
    }));

    // Postal code pour fetch-shipping-options = postal_code du destinataire
    const fetchPostalCode = recipientPostalCode || "06500";
    const fetchCountry    = recipientCountry;

    // ── 3. POST /api/v3/fetch-shipping-options ──────────────────────────────
    const optionsBody: Record<string, any> = {
      from_address: { id: senderAddressId },
      to_address:   { country_iso_2: fetchCountry, postal_code: fetchPostalCode },
      weight:       { value: fetchWeightKg, unit: "kg" },
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

    const allCodes = allOptions.map((o: any) => o.code ?? o.shipping_option_code).filter(Boolean);
    console.log(`[sendcloud:v3:options] ${allOptions.length} options trouvées, codes:`, allCodes.join(" | "));

    // Dump exhaustif : tous les codes + noms retournés par Sendcloud, AVANT
    // tout filtre pickShippingOption. Sert à identifier le code exact
    // disponible sur ce compte (ex : colissimo:home vs colissimo:domestic_home).
    const allOptionsDump = JSON.stringify(
      allOptions.map((o: any) => ({ code: o.code ?? o.shipping_option_code, name: o.name }))
    );
    console.log("[sendcloud:v3:all-options]",  allOptionsDump);
    console.error("[sendcloud:v3:all-options]", allOptionsDump);

    // Dump COMPLET avec toutes les fonctionnalités (last_mile, carrier,
    // contract, functionalities, etc.) pour identifier le bon code Colissimo
    // Service Point (vs colissimo:post-office qui est Bureau de Poste).
    const fullOptionsDump = JSON.stringify(allOptions);
    console.log("[sendcloud:v3:full-options]",  fullOptionsDump.slice(0, 8000));
    console.error("[sendcloud:v3:full-options]", fullOptionsDump.slice(0, 8000));
    // Si la liste dépasse 8000 chars, log la longueur totale pour qu'on sache
    // qu'on a tronqué
    if (fullOptionsDump.length > 8000) {
      console.log(`[sendcloud:v3:full-options] (truncated — total length=${fullOptionsDump.length} chars)`);
    }

    // ── 4. Choisir le bon shipping_option_code ──────────────────────────────
    // Mapping hardcodé (cf. SENDCLOUD_OPTION_CODES). On NE fait PAS de regex
    // matching parce que les noms des codes varient (ex: "colissimo:post-office"
    // n'accepte PAS to_service_point alors qu'il contient pas "international").
    // Seul le code exact validé sur le compte est fiable.
    const { selected, expectedCode } = pickShippingOption(allOptions, effectiveCarrier, deliveryType);
    if (!selected || !expectedCode) {
      return Response.json({
        error: `Aucun shipping_option_code configuré pour ${effectiveCarrier}/${deliveryType}. Ajoute SENDCLOUD_OPTION_CODE_${effectiveCarrier.toUpperCase()}_${deliveryType.toUpperCase()} dans les env vars Vercel, ou complète SENDCLOUD_OPTION_CODES dans le code.`,
        available_codes: allCodes,
      }, { status: 400 });
    }
    const shippingOptionCode = expectedCode;
    const codeFoundInOptions = allCodes.includes(expectedCode);
    const pickedLog = JSON.stringify({
      effectiveCarrier,
      deliveryType,
      picked_code:           shippingOptionCode,
      picked_name:           selected.name,
      source:                selected._from === "hardcoded_mapping" ? "hardcoded (not in available_codes)" : "hardcoded (matched in available_codes)",
      code_found_in_options: codeFoundInOptions,
      all_available_codes:   allCodes,
    });
    console.log("[sendcloud:v3:picked]",  pickedLog);
    console.error("[sendcloud:v3:picked]", pickedLog);

    if (!codeFoundInOptions) {
      console.warn(`[sendcloud] ⚠ code "${expectedCode}" PAS dans les options retournées — Sendcloud risque de rejeter. Codes dispos: ${allCodes.join(" | ")}`);
    }

    // ── 5. POST /api/v3/shipments/announce ──────────────────────────────────
    // Structure v3 conforme à la spec OpenAPI officielle Sendcloud :
    //   - ship_with.type = "shipping_option_code" (DISCRIMINATOR obligatoire)
    //   - ship_with.properties.shipping_option_code (la clé est nommée comme le type)
    //   - from_address.sender_address_id (PAS "id")
    //   - to_address.country_code (PAS "country_iso_2")
    //   - to_service_point.id en STRING
    //   - parcels[].weight.value en STRING
    const announceBody: Record<string, any> = {
      ship_with: {
        type: "shipping_option_code",
        properties: {
          shipping_option_code: shippingOptionCode,
        },
      },
      from_address: { sender_address_id: senderAddressId },
      to_address: {
        name:           customerName,
        address_line_1: recipientAddressLine1,
        city:           recipientCity,
        postal_code:    recipientPostalCode,
        country_code:   recipientCountry,
        email:          order.customer_email ?? "",
        phone_number:   phoneNumber,
      },
      parcels:      [{ weight: { value: weightKgStr, unit: "kg" } }],
      order_number: String(order.id ?? "").slice(0, 30),
      request_label: true,
    };
    // to_service_point : envoyé pour TOUS les codes quand un relais est
    // sélectionné. La logique de skip via CODES_WITHOUT_SERVICE_POINT est
    // conservée comme garde-fou pour le futur, mais le set est vide.
    if (numericRelayId) {
      announceBody.to_service_point = { id: String(numericRelayId) };
      console.log(`[sendcloud] to_service_point.id="${numericRelayId}" attaché (code=${shippingOptionCode})`);
    }

    const announceBodyStr = JSON.stringify(announceBody);
    console.log("[sendcloud:v3:announce:body]",  announceBodyStr);
    console.error("[sendcloud:v3:announce:body]", announceBodyStr);

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
        // Diagnostic : toutes les options Sendcloud disponibles, avec leurs
        // fonctionnalités (last_mile, carrier, etc.) pour identifier le bon
        // code à hardcoder dans SENDCLOUD_OPTION_CODES.
        all_options_full: allOptions,
      }, { status: 400 });
    }

    // ── 6. Extraire tracking + label_url ────────────────────────────────────
    // Format v3 sans wrapper "shipments" : la réponse est l'objet shipment
    // directement, ou wrappé dans "data". On gère les deux + fallback
    // historique "shipments[0]" pour rester rétro-compatible si Sendcloud
    // varie selon les endpoints.
    const shipment =
      announceJson?.data
      ?? (Array.isArray(announceJson?.shipments) ? announceJson.shipments[0] : null)
      ?? (Array.isArray(announceJson?.data)      ? announceJson.data[0]      : null)
      ?? announceJson
      ?? null;

    if (!shipment) {
      return Response.json({
        error: "Réponse Sendcloud sans shipment — format inattendu",
        sendcloud_body: announceJson,
      }, { status: 500 });
    }

    // Extraction tracking + label depuis la réponse Sendcloud v3.
    // Format v3 typique :
    //   data: {
    //     id: "<shipment uuid>",
    //     parcels: [{
    //       id: "<parcel uuid>",
    //       tracking_number: "...",
    //       documents: [{ type: "label", format: "pdf", link: "https://..." }]
    //     }]
    //   }
    // Cascade pour gérer aussi les anciens formats v2 (label.normal_printer).
    const firstParcel = Array.isArray(shipment?.parcels) ? shipment.parcels[0] : null;

    let trackingNumber: string =
      shipment?.tracking_number
      ?? firstParcel?.tracking_number
      ?? "";

    const findLabelLink = (docs: any): string | null => {
      if (!Array.isArray(docs)) return null;
      const labelDoc = docs.find((d: any) => d?.type === "label") ?? docs[0];
      return labelDoc?.link ?? labelDoc?.url ?? null;
    };

    let labelUrl: string =
      // v3 — documents sont sur le parcel imbriqué
      findLabelLink(firstParcel?.documents)
      // v3 — documents directement sur le shipment (variations)
      ?? findLabelLink(shipment?.documents)
      // v2 legacy — label.normal_printer ou label_printer
      ?? shipment?.label?.normal_printer?.[0]
      ?? shipment?.label?.label_printer?.[0]
      ?? firstParcel?.label?.normal_printer?.[0]
      ?? firstParcel?.label?.label_printer?.[0]
      ?? "";

    // parcel_id : on stocke l'ID du shipment v3 (UUID) qui sert à interroger
    // /api/v3/shipments/{id} pour récupérer l'étiquette plus tard.
    // Si la réponse est plate (parcel direct), on prend son id.
    const parcelId = shipment?.id ?? firstParcel?.id ?? null;

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
