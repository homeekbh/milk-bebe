import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

function getBasicAuth() {
  const pub = process.env.SENDCLOUD_PUBLIC_KEY ?? "";
  const sec = process.env.SENDCLOUD_SECRET_KEY ?? "";
  return "Basic " + Buffer.from(`${pub}:${sec}`).toString("base64");
}

/**
 * GET /api/admin/sendcloud/label-pdf?order_id=<uuid>
 *
 * Proxy authentifié pour télécharger le PDF d'étiquette Sendcloud.
 * Sendcloud retourne le PDF derrière Basic auth — on ne peut pas
 * directement lier le navigateur vers panel.sendcloud.sc (401).
 *
 * 1. Vérifie l'auth admin
 * 2. Récupère label_url depuis la commande
 * 3. Fait le fetch vers Sendcloud avec Basic auth
 * 4. Stream le PDF en `inline` au navigateur
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

  // ── Retry GET v2 si label_url manquant mais parcel_id présent ─────────────
  // Cas typique : create-label a réussi à créer le parcel mais Sendcloud n'a
  // pas généré l'étiquette PDF (souvent parce que le parcel a été créé sans
  // request_label: true avant le fix d350807). On force d'abord la génération
  // avec PUT /api/v2/parcels (set request_label = true), puis on retry GET.
  if (!labelUrl && order.sendcloud_parcel_id) {
    console.error(`[sendcloud:label-pdf] label_url vide pour order ${orderId} (parcel ${order.sendcloud_parcel_id}) — PUT request_label puis retry GET v2`);

    // Étape 1 — PUT pour DÉCLENCHER la génération de l'étiquette sur un parcel
    // déjà announced. Sendcloud accepte `request_label: true` dans le PUT pour
    // les parcels en état "ready_to_send" ou "announced sans label".
    try {
      const putRes = await fetch(`https://panel.sendcloud.sc/api/v2/parcels`, {
        method:  "PUT",
        headers: {
          Authorization:  getBasicAuth(),
          "Content-Type": "application/json",
          Accept:         "application/json",
        },
        body: JSON.stringify({
          parcel: {
            id:            Number(order.sendcloud_parcel_id),
            request_label: true,
          },
        }),
      });
      const putText = await putRes.text();
      console.error(`[sendcloud:label-pdf PUT request_label] HTTP ${putRes.status} body=${putText.slice(0, 600)}`);
    } catch (e: any) {
      console.error(`[sendcloud:label-pdf PUT request_label] exception:`, e?.message);
    }

    // Étape 2 — GET retry jusqu'à 4× avec 2s entre chaque pour récupérer l'URL
    for (let attempt = 1; attempt <= 4; attempt++) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const retryRes = await fetch(`https://panel.sendcloud.sc/api/v2/parcels/${order.sendcloud_parcel_id}`, {
          method:  "GET",
          headers: {
            Authorization: getBasicAuth(),
            Accept:        "application/json",
          },
        });
        const retryText = await retryRes.text();
        let retryJson: any = null;
        try { retryJson = JSON.parse(retryText); } catch {}

        console.error(`[sendcloud:label-pdf retry ${attempt}/4] HTTP ${retryRes.status}`);

        if (!retryRes.ok) {
          console.error(`[sendcloud:label-pdf retry ${attempt}/4] body=${retryText.slice(0, 500)}`);
          continue;
        }

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
          console.error(`[sendcloud:label-pdf retry ${attempt}/4] SUCCESS — label récupéré`);

          // Persister en base — 2-step pour ne pas tout perdre si une colonne manque
          await supabaseServer.from("orders").update({
            label_url: labelUrl,
          }).eq("id", orderId);
          if (trackingNumber && trackingNumber !== order.tracking_number) {
            await supabaseServer.from("orders").update({
              tracking_number: trackingNumber,
            }).eq("id", orderId);
          }

          break;
        } else {
          console.error(`[sendcloud:label-pdf retry ${attempt}/4] label toujours vide (status: ${parcel?.status?.message ?? "?"}), on continue`);
        }
      } catch (e: any) {
        console.error(`[sendcloud:label-pdf retry ${attempt}/4] exception:`, e?.message);
      }
    }
  }

  if (!labelUrl) {
    return Response.json({
      error:     "Étiquette non encore générée — réessayer dans 30 secondes",
      pending:   true,
      parcel_id: order.sendcloud_parcel_id,
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
    console.error("[sendcloud:label-pdf] fetch error:", e);
    return Response.json({ error: "Impossible de joindre Sendcloud" }, { status: 502 });
  }

  if (!labelRes.ok) {
    const text = await labelRes.text().catch(() => "");
    console.error(`[sendcloud:label-pdf] HTTP ${labelRes.status}:`, text.slice(0, 800));
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
