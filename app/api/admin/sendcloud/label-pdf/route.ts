import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

const SENDCLOUD_V3 = "https://panel.sendcloud.sc/api/v3";
const SENDCLOUD_V2 = "https://panel.sendcloud.sc/api/v2";

function getBasicAuth() {
  const pub = process.env.SENDCLOUD_PUBLIC_KEY ?? "";
  const sec = process.env.SENDCLOUD_SECRET_KEY ?? "";
  return "Basic " + Buffer.from(`${pub}:${sec}`).toString("base64");
}

/**
 * Détecte si un parcel_id est au format UUID v3 (4-hex-2-...-2-12)
 * versus un integer v2 historique.
 */
function isUuidV3(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Extrait le lien label depuis une réponse Sendcloud (v2 ou v3).
 * Cascade : parcels[0].documents → shipment.documents → label.normal_printer.
 */
function extractLabelFromResponse(json: any): { tracking: string; labelUrl: string } {
  const shipment = json?.data ?? json?.parcel ?? json?.shipment ?? json ?? null;
  const firstParcel = Array.isArray(shipment?.parcels) ? shipment.parcels[0] : null;

  const findLabelLink = (docs: any): string | null => {
    if (!Array.isArray(docs)) return null;
    const labelDoc = docs.find((d: any) => d?.type === "label") ?? docs[0];
    return labelDoc?.link ?? labelDoc?.url ?? null;
  };

  const labelUrl =
    findLabelLink(firstParcel?.documents)
    ?? findLabelLink(shipment?.documents)
    ?? shipment?.label?.normal_printer?.[0]
    ?? shipment?.label?.label_printer?.[0]
    ?? firstParcel?.label?.normal_printer?.[0]
    ?? firstParcel?.label?.label_printer?.[0]
    ?? "";

  const tracking = shipment?.tracking_number ?? firstParcel?.tracking_number ?? "";

  return { tracking: String(tracking), labelUrl: String(labelUrl) };
}

/**
 * GET /api/admin/sendcloud/label-pdf?order_id=<uuid>
 *
 * Proxy authentifié pour télécharger le PDF d'étiquette Sendcloud.
 * Sendcloud retourne le PDF derrière Basic auth — on ne peut pas
 * directement lier le navigateur vers panel.sendcloud.sc (401).
 *
 * Flow :
 *   1. Vérifie l'auth admin
 *   2. Lit label_url, sendcloud_parcel_id depuis la commande
 *   3. Si label_url absent : récupère depuis Sendcloud
 *      - parcel_id UUID  → GET /api/v3/shipments/{id}
 *      - parcel_id integer → GET /api/v2/parcels/{id} (legacy)
 *   4. Persiste label_url en base
 *   5. Stream le PDF en `inline` au navigateur
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("order_id");
  if (!orderId) {
    return Response.json({ error: "order_id manquant" }, { status: 400 });
  }

  const { data: order, error: orderErr } = await supabaseServer
    .from("orders")
    .select("id, label_url, sendcloud_parcel_id, tracking_number, customer_name")
    .eq("id", orderId)
    .single();

  if (orderErr || !order) {
    return Response.json({ error: "Commande introuvable" }, { status: 404 });
  }

  let labelUrl: string = order.label_url ?? "";
  let trackingNumber: string = order.tracking_number ?? "";
  const parcelId = String(order.sendcloud_parcel_id ?? "");

  // ── Retry Sendcloud si label_url absent mais parcel_id présent ──────────
  if (!labelUrl && parcelId) {
    const useV3 = isUuidV3(parcelId);
    const getUrl = useV3
      ? `${SENDCLOUD_V3}/shipments/${parcelId}`
      : `${SENDCLOUD_V2}/parcels/${parcelId}`;

    console.log(`[sendcloud:label-pdf] retry on ${useV3 ? "v3" : "v2"} for parcel_id="${parcelId}"`);

    // Pour v2 uniquement : trigger PUT request_label avant le GET.
    // (Sur v3, l'étiquette est générée d'office avec request_label:true à
    // la création — pas besoin de re-trigger.)
    if (!useV3) {
      try {
        const putRes = await fetch(`${SENDCLOUD_V2}/parcels`, {
          method:  "PUT",
          headers: {
            Authorization:  getBasicAuth(),
            "Content-Type": "application/json",
            Accept:         "application/json",
          },
          body: JSON.stringify({
            parcel: {
              id:            Number(parcelId),
              request_label: true,
            },
          }),
        });
        const putText = await putRes.text();
        console.log(`[sendcloud:label-pdf PUT v2 request_label] HTTP ${putRes.status} body=${putText.slice(0, 400)}`);
      } catch (e: any) {
        console.log("[sendcloud:label-pdf PUT v2] exception:", e?.message);
      }
    }

    // GET retry jusqu'à 4× avec 2s entre chaque pour récupérer l'URL
    for (let attempt = 1; attempt <= 4; attempt++) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const retryRes = await fetch(getUrl, {
          method:  "GET",
          headers: {
            Authorization: getBasicAuth(),
            Accept:        "application/json",
          },
        });
        const retryText = await retryRes.text();
        let retryJson: any = null;
        try { retryJson = JSON.parse(retryText); } catch {}

        console.log(`[sendcloud:label-pdf retry ${attempt}/4 ${useV3 ? "v3" : "v2"}] HTTP ${retryRes.status}`);

        if (!retryRes.ok) {
          console.log(`[sendcloud:label-pdf retry ${attempt}/4] body=${retryText.slice(0, 500)}`);
          continue;
        }

        const { tracking: newTracking, labelUrl: newLabel } = extractLabelFromResponse(retryJson);

        if (newLabel) {
          labelUrl = newLabel;
          if (newTracking) trackingNumber = newTracking;
          console.log(`[sendcloud:label-pdf retry ${attempt}/4] SUCCESS — label récupéré: ${labelUrl.slice(0, 80)}`);

          // Persister en base (2-step pour ne pas tout perdre)
          const { error: lpErr } = await supabaseServer.from("orders").update({ label_url: labelUrl }).eq("id", orderId);
          if (lpErr) console.warn("[sendcloud:label-pdf] persistance label_url échouée:", lpErr.message);
          if (trackingNumber && trackingNumber !== order.tracking_number) {
            await supabaseServer.from("orders").update({
              tracking_number: trackingNumber,
            }).eq("id", orderId);
          }
          break;
        } else {
          console.log(`[sendcloud:label-pdf retry ${attempt}/4] label toujours vide`);
        }
      } catch (e: any) {
        console.log(`[sendcloud:label-pdf retry ${attempt}/4] exception:`, e?.message);
      }
    }
  }

  if (!labelUrl) {
    return Response.json({
      error:     "Étiquette non encore générée — réessayer dans 30 secondes",
      pending:   true,
      parcel_id: parcelId || null,
    }, { status: 404 });
  }

  // Fetch PDF depuis Sendcloud avec Basic auth
  let labelRes: Response;
  try {
    labelRes = await fetch(labelUrl, {
      headers: {
        Authorization: getBasicAuth(),
        Accept:        "application/pdf",
      },
    });
  } catch (e: any) {
    console.error("[sendcloud:label-pdf] fetch PDF error:", e);
    return Response.json({ error: "Impossible de joindre Sendcloud" }, { status: 502 });
  }

  if (!labelRes.ok) {
    const text = await labelRes.text().catch(() => "");
    console.error(`[sendcloud:label-pdf] PDF HTTP ${labelRes.status}:`, text.slice(0, 800));
    return Response.json({
      error:            `Sendcloud HTTP ${labelRes.status}`,
      sendcloud_status: labelRes.status,
      sendcloud_body:   text.slice(0, 1500),
      label_url:        labelUrl,
    }, { status: 502 });
  }

  const pdfBuffer = await labelRes.arrayBuffer();
  const filename  = `etiquette-${(trackingNumber || order.id).toString().slice(0, 30)}.pdf`;

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control":       "private, max-age=0, no-store",
    },
  });
}
