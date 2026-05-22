import { requireAdmin } from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

const SENDCLOUD_API = "https://panel.sendcloud.sc/api/v3";

function getBasicAuth() {
  const pub = process.env.SENDCLOUD_PUBLIC_KEY ?? "";
  const sec = process.env.SENDCLOUD_SECRET_KEY ?? "";
  return "Basic " + Buffer.from(`${pub}:${sec}`).toString("base64");
}

/**
 * GET /api/admin/sendcloud/shipping-products?carrier=mondial
 *
 * Récupère les produits/options de livraison Sendcloud disponibles
 * (configurés côté compte Sendcloud) — filtrés par carrier.
 *
 * Retourne: { products: [{ code, name, carrier_name, contract_id }] }
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const filter = (searchParams.get("carrier") ?? "mondial").toLowerCase();

  try {
    const res = await fetch(`${SENDCLOUD_API}/shipping-products`, {
      method:  "GET",
      headers: {
        Authorization: getBasicAuth(),
        Accept:        "application/json",
      },
    });
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch {}

    if (!res.ok) {
      console.error(`[sendcloud:shipping-products] HTTP ${res.status}:`, text.slice(0, 800));
      return Response.json({
        error:            `Sendcloud HTTP ${res.status}`,
        sendcloud_status: res.status,
        sendcloud_body:   json ?? text.slice(0, 1500),
      }, { status: 502 });
    }

    const raw: any[] = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);

    const products = raw
      .map((p: any) => ({
        code:         p.code ?? p.shipping_product_code ?? p.shipping_option_code,
        name:         p.name ?? "",
        carrier_name: p.carrier?.name ?? p.carrier?.code ?? "",
        carrier_code: p.carrier?.code ?? "",
        contract_id:  p.contract?.id ?? p.contract_id ?? null,
        weight_min:   p.weight?.min ?? null,
        weight_max:   p.weight?.max ?? null,
      }))
      .filter((p: any) => {
        const haystack = `${p.code} ${p.name} ${p.carrier_name} ${p.carrier_code}`.toLowerCase();
        return p.code && haystack.includes(filter);
      });

    console.error(`[sendcloud:shipping-products] filter="${filter}" total=${raw.length} matched=${products.length}`);

    return Response.json({ products, total: raw.length, matched: products.length });
  } catch (e: any) {
    console.error("[sendcloud:shipping-products] exception:", e);
    return Response.json({ error: e.message ?? "Erreur interne" }, { status: 500 });
  }
}
