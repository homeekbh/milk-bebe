import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

const SENDCLOUD_API = "https://panel.sendcloud.sc/api/v3";

// Adresse expéditeur M!LK (Menton) — ASCII safe, sans em-dash ni !
const FROM_ADDRESS = {
  name:           "MILK Essentiels Bebe",
  company_name:   "EKBH",
  address_line_1: "6 Impasse des Cabrolles",
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
 * Compacte une adresse : retire les clés avec valeur falsy/vide
 * (Sendcloud v3 refuse parfois les "" — préfère l'omission).
 */
function compactAddress(a: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(a)) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s === "") continue;
    out[k] = s;
  }
  return out;
}

/**
 * Log + parse de la réponse Sendcloud — utilise console.error
 * pour garantir l'affichage dans les logs Vercel runtime.
 */
async function logSendcloudCall(label: string, res: Response): Promise<{ status: number; ok: boolean; json: any; text: string }> {
  const status = res.status;
  const text   = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch {}

  console.error(`[sendcloud:${label}] HTTP ${status}`);
  console.error(`[sendcloud:${label}] response body:`, text.slice(0, 6000));

  // Si erreur, essayer d'extraire le pointer du champ fautif
  if (!res.ok && json) {
    const errors = Array.isArray(json.errors) ? json.errors : [];
    if (errors.length > 0) {
      console.error(`[sendcloud:${label}] errors[]:`, JSON.stringify(errors));
      errors.forEach((e: any, i: number) => {
        const pointer = e?.source?.pointer ?? "(no pointer)";
        const detail  = e?.detail  ?? e?.message ?? "(no detail)";
        const code    = e?.code    ?? e?.title   ?? "(no code)";
        console.error(`[sendcloud:${label}] error #${i}: pointer=${pointer} code=${code} detail=${detail}`);
      });
    } else if (json.error) {
      console.error(`[sendcloud:${label}] error:`, JSON.stringify(json.error));
    }
  }

  return { status, ok: res.ok, json, text };
}

/**
 * Extrait un message d'erreur lisible depuis la réponse Sendcloud.
 */
function extractError(json: any, fallback: string): string {
  if (!json) return fallback;
  const errors = Array.isArray(json.errors) ? json.errors : [];
  if (errors.length > 0) {
    return errors.map((e: any) => {
      const pointer = e?.source?.pointer ? ` [${e.source.pointer}]` : "";
      return `${e?.detail ?? e?.title ?? "Erreur"}${pointer}`;
    }).join(" | ");
  }
  return json?.error?.message ?? json?.message ?? fallback;
}

/**
 * POST /api/admin/sendcloud/create-label
 * Body: { order_id: string, transporteur?: string }
 *
 * Flow v3 :
 *   1. /fetch-shipping-options  → récupère shipping_option_code + contract_id
 *   2. /shipments/announce      → crée le colis + génère l'étiquette PDF
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

    // GARDE-FOU — si un parcel Sendcloud existe déjà, on n'en crée PAS un nouveau.
    // Chaque clic accidentel sur "Créer étiquette" créerait sinon un nouveau colis
    // facturé chez Sendcloud (cas observé : 3 parcels pour la même commande).
    // À la place, on renvoie un message qui pointe l'admin vers "Vérifier
    // l'étiquette" (label-pdf), qui s'occupe de récupérer/forcer le label sur
    // le parcel existant.
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

    // Les anciennes commandes "locker" sont traitées comme "point_relais"
    // (même transporteur Mondial Relay, même flow). Le mode locker a été
    // supprimé du choix client.
    const rawDeliveryType = order.delivery_type as (string | null);
    const deliveryType: "point_relais" | "home" | null =
      rawDeliveryType === "locker"       ? "point_relais" :
      rawDeliveryType === "point_relais" ? "point_relais" :
      rawDeliveryType === "home"         ? "home"         :
      null;
    const relayId      = order.relay_id as (string | null);
    const isRelayMode  = deliveryType === "point_relais";

    // Validation : si point_relais → relay_id obligatoire
    if (isRelayMode && !relayId) {
      return Response.json({ error: "Point relais manquant — saisie manuelle requise dans la commande" }, { status: 400 });
    }

    const addr = order.shipping_address ?? {};

    // Validation adresse client UNIQUEMENT pour home (ou si delivery_type absent = ancienne commande)
    // En mode point_relais : Sendcloud utilise l'adresse du service point,
    // pas besoin de valider l'adresse client (souvent vide ou incomplète).
    if (!isRelayMode && (!addr.line1 || !addr.postal_code || !addr.city)) {
      console.error("[sendcloud] Adresse incomplète (mode home):", JSON.stringify(addr));
      return Response.json({ error: "Adresse de livraison incomplète (line1/postal_code/city manquant)" }, { status: 400 });
    }

    // Poids par défaut 0.250 kg (vêtement bébé bambou typique)
    const weightKg = order.total_weight_g ? Math.max(0.05, order.total_weight_g / 1000) : 0.250;

    // Adresse destinataire — construction différente selon mode
    //   - Home : adresse complète du client (validée ci-dessus)
    //   - Point Relais : minimum requis par Sendcloud (name + country) ; les
    //     champs adresse seront overridés par le service point côté Sendcloud
    //     dès qu'on attache to_service_point dans ship_with.properties.
    const customerName = sanitizeName(addr.name || order.customer_name || "Client");

    const toAddressRaw = isRelayMode
      ? {
          // Mode relais : on envoie le minimum + pays. Sendcloud ignore les
          // autres champs car to_service_point prend le relais (jeu de mots).
          name:           customerName,
          email:          order.customer_email,
          phone_number:   addr.phone,
          country_code:   String(addr.country ?? "FR").toUpperCase().slice(0, 2),
          // Fallback adresse vers l'adresse client si dispo, sinon adresse
          // expéditeur (certaines APIs Sendcloud exigent les 3 champs même
          // quand to_service_point est attaché). Sendcloud les ignore.
          address_line_1: addr.line1       || FROM_ADDRESS.address_line_1,
          postal_code:    addr.postal_code || FROM_ADDRESS.postal_code,
          city:           addr.city        || FROM_ADDRESS.city,
        }
      : {
          // Mode home : adresse complète du client (validée)
          name:           customerName,
          company_name:   addr.company,
          address_line_1: addr.line1,
          address_line_2: addr.line2,
          postal_code:    addr.postal_code,
          city:           addr.city,
          country_code:   String(addr.country ?? "FR").toUpperCase().slice(0, 2),
          phone_number:   addr.phone,
          email:          order.customer_email,
        };

    const toAddress   = compactAddress(toAddressRaw);
    const fromAddress = compactAddress(FROM_ADDRESS);

    // Dimensions : vêtement bébé plié (25 × 15 × 3 cm)
    const parcel = {
      weight: { value: weightKg.toFixed(3), unit: "kg" },
      dimensions: {
        length: "25",
        width:  "15",
        height: "3",
        unit:   "cm",
      },
    };

    console.error(`[sendcloud] === REQUEST order=${order_id} delivery_type="${deliveryType ?? "(none)"}" transporteur="${transporteur}" weight=${weightKg}kg ===`);
    console.error(`[sendcloud] from=${fromAddress.city}/${fromAddress.postal_code}  to=${toAddress.city}/${toAddress.postal_code}/${toAddress.country_code}`);
    if (deliveryType === "home") {
      console.error(`[sendcloud] HOME mode → pas de to_service_point, livraison à l'adresse domicile`);
    } else if (relayId) {
      console.error(`[sendcloud] RELAY mode → to_service_point sera attaché: ${relayId}`);
    }

    // ── 2. Fetch shipping options ───────────────────────────────────────────
    const optsBody = {
      from_address: fromAddress,
      to_address:   toAddress,
      parcels:      [parcel],
    };
    console.error(`[sendcloud:fetch-options] BODY SENT:`, JSON.stringify(optsBody));

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
      return Response.json({
        error:            extractError(optsLog.json, `Sendcloud /fetch-shipping-options HTTP ${optsLog.status}`),
        endpoint:         `${SENDCLOUD_API}/fetch-shipping-options`,
        sendcloud_status: optsLog.status,
        sendcloud_body:   optsLog.json,
        sendcloud_raw:    optsLog.text?.slice(0, 3000),
        payload_sent:     optsBody,
      }, { status: 400 });
    }

    const optsData = optsLog.json;
    const options: any[] = Array.isArray(optsData?.data) ? optsData.data : (Array.isArray(optsData) ? optsData : []);
    if (options.length === 0) {
      return Response.json({ error: "Aucune option de livraison disponible pour ce colis Sendcloud" }, { status: 400 });
    }

    console.error(`[sendcloud:fetch-options] ${options.length} options dispo, sample:`,
      JSON.stringify(options.slice(0, 5).map((o: any) => ({
        code:     o.shipping_option_code ?? o.code,
        carrier:  o.carrier?.name ?? o.carrier?.code,
        contract: o.contract?.id ?? o.contract_id,
        name:     o.name,
      })))
    );

    // ── 3. Match par nom de transporteur ────────────────────────────────────
    const carrierLower = String(transporteur ?? "").toLowerCase();
    const wantedKey =
      carrierLower.includes("mondial")    ? "mondial"    :
      carrierLower.includes("colissimo")  ? "colissimo"  :
      carrierLower.includes("chronopost") ? "chronopost" :
      carrierLower.includes("la poste")   ? "colissimo"  :
      carrierLower;

    // Pour livraison domestique (même pays), on EXCLUT les options "international"
    // sinon Sendcloud refuse avec "No shipping option could be found".
    const isDomestic = fromAddress.country_code === toAddress.country_code;

    const matchesCarrier = (o: any) => {
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
    };

    const isInternationalOption = (o: any) => {
      const code = String(o?.shipping_option_code ?? o?.code ?? "").toLowerCase();
      const name = String(o?.name ?? "").toLowerCase();
      return code.includes("international") || name.includes("international");
    };

    const isDomesticOption = (o: any) => {
      const code = String(o?.shipping_option_code ?? o?.code ?? "").toLowerCase();
      return code.includes(":home/") || code.includes(":domestic/") || code.includes(":national/");
    };

    // Priorité : domestic match → carrier match non-international → carrier match → 1er fallback
    const selected =
      (isDomestic && options.find(o => matchesCarrier(o) && isDomesticOption(o))) ||
      (isDomestic && options.find(o => matchesCarrier(o) && !isInternationalOption(o))) ||
      options.find(o => matchesCarrier(o)) ||
      options[0];

    if (isDomestic && selected && isInternationalOption(selected)) {
      console.error(`[sendcloud] WARN: livraison domestique FR→FR mais seul "${selected?.shipping_option_code}" (international) trouvé — Sendcloud va probablement refuser`);
    }

    // Log COMPLET des codes dispo (au-delà du sample) si on cherche encore à comprendre
    console.error(`[sendcloud] all available codes:`, options.map((o: any) => o.shipping_option_code ?? o.code).filter(Boolean).join(" | "));

    const shippingOptionCode = selected?.shipping_option_code ?? selected?.code ?? null;
    // contract_id DOIT être un integer ou omis — sinon Sendcloud renvoie 400
    const rawContractId = selected?.contract?.id ?? selected?.contract_id ?? null;
    const contractId    = (typeof rawContractId === "number" && Number.isInteger(rawContractId))
      ? rawContractId
      : (typeof rawContractId === "string" && /^\d+$/.test(rawContractId) ? parseInt(rawContractId, 10) : null);

    console.error(`[sendcloud] selected: code=${shippingOptionCode} contract=${contractId} carrier=${selected?.carrier?.name}`);

    if (!shippingOptionCode) {
      console.error("[sendcloud] Aucun shipping_option_code dans:", JSON.stringify(selected).slice(0, 1500));
      return Response.json({ error: "Code transporteur Sendcloud manquant dans la réponse" }, { status: 400 });
    }

    // ── 4. Announce shipment ────────────────────────────────────────────────
    // request_label: true force la génération synchrone de l'étiquette PDF.
    // Sans ce flag, Sendcloud crée le parcel en "announced" sans étiquette,
    // et le colis n'apparaît même pas dans le panel Sendcloud.
    const shipWithProps: Record<string, any> = {
      shipping_option_code: shippingOptionCode,
      request_label:        true,
    };
    if (contractId !== null) shipWithProps.contract_id = contractId;

    // Si point_relais → on attache le service point sélectionné par le client
    if (relayId && deliveryType === "point_relais") {
      shipWithProps.to_service_point = relayId;
    }

    const announceBody = {
      from_address: fromAddress,
      to_address:   toAddress,
      ship_with: {
        type:       "shipping_option_code",
        properties: shipWithProps,
      },
      order_number: String(order.id ?? "").slice(0, 30),
      parcels:      [parcel],
    };
    console.error(`[sendcloud:announce] BODY SENT:`, JSON.stringify(announceBody));

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
      return Response.json({
        error:            extractError(announceLog.json, `Sendcloud /shipments/announce HTTP ${announceLog.status}`),
        endpoint:         `${SENDCLOUD_API}/shipments/announce`,
        sendcloud_status: announceLog.status,
        sendcloud_body:   announceLog.json,
        sendcloud_raw:    announceLog.text?.slice(0, 3000),
        payload_sent:     announceBody,
      }, { status: 400 });
    }

    // ── 5. Extraire tracking + label ────────────────────────────────────────
    const announceData = announceLog.json;
    const announced = announceData?.data?.parcels?.[0] ?? announceData?.parcels?.[0] ?? null;
    let trackingNumber: string = announced?.tracking_number ?? "";
    const documents: any[] = Array.isArray(announced?.documents) ? announced.documents : [];
    const labelDoc = documents.find(d => d?.type === "label") ?? documents[0];
    let labelUrl: string = labelDoc?.link ?? "";
    const parcelId = announced?.id ?? null;

    console.error(`[sendcloud:announce] SUCCESS tracking=${trackingNumber || "(pending)"} label=${labelUrl ? "OK" : "MISSING"} parcel_id=${parcelId}`);

    // ── 5bis. Retry GET v2 si label_url vide ─────────────────────────────────
    // Sendcloud génère parfois l'étiquette de façon asynchrone après l'announce.
    // On retry 3× avec 2s entre chaque sur GET /api/v2/parcels/{id} qui retourne
    // l'URL du label PDF dès qu'il est prêt.
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

          // Format v2 : { parcel: { tracking_number, label: { normal_printer: [...], label_printer: [...] } } }
          const parcel = retryJson?.parcel ?? retryJson?.data ?? retryJson;
          const newTracking = parcel?.tracking_number ?? "";
          const newLabel    =
            parcel?.label?.normal_printer?.[0] ??
            parcel?.label?.label_printer?.[0]  ??
            (Array.isArray(parcel?.documents) ? parcel.documents.find((d: any) => d?.type === "label")?.link : null) ??
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
    // optionnelle (label_url, sendcloud_parcel_id, shipped_at) manque.
    //
    // Étape 1 (GARANTI) — colonnes qui existent à coup sûr (statut)
    const { error: updateErr1 } = await supabaseServer
      .from("orders")
      .update({
        shipping_status: "expediee",
        tracking_number: trackingNumber || null,
      })
      .eq("id", order_id);
    if (updateErr1) console.error("[sendcloud] Supabase update statut/tracking:", updateErr1);

    // Étape 2 (BEST-EFFORT) — colonnes optionnelles. Si l'une manque,
    // l'erreur est loggée mais le statut/tracking sont déjà à jour.
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
    if (!labelUrl) {
      return Response.json({
        ok:              true,
        pending:         true,
        tracking_number: trackingNumber,
        label_url:       null,
        parcel_id:       parcelId,
        shipping_option: selected?.name ?? shippingOptionCode,
        message:         `Colis créé (ID: ${parcelId}) — étiquette en cours, réessayer dans 30 secondes`,
      });
    }

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
