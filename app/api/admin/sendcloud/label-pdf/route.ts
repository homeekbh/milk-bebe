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

  if (!order.label_url) {
    return Response.json({ error: "Étiquette non générée pour cette commande" }, { status: 404 });
  }

  // Fetch PDF depuis Sendcloud avec Basic auth
  let labelRes: Response;
  try {
    labelRes = await fetch(order.label_url, {
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
      label_url:        order.label_url,
    }, { status: 502 });
  }

  const pdfBuffer = await labelRes.arrayBuffer();
  const filename  = `etiquette-${(order.tracking_number ?? order.id).toString().slice(0, 30)}.pdf`;

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control":       "private, max-age=0, no-store",
    },
  });
}
