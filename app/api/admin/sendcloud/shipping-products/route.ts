import { requireAdmin } from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

function getBasicAuth() {
  const pub = process.env.SENDCLOUD_PUBLIC_KEY ?? "";
  const sec = process.env.SENDCLOUD_SECRET_KEY ?? "";
  return "Basic " + Buffer.from(`${pub}:${sec}`).toString("base64");
}

// Liste d'endpoints à tester en cascade jusqu'à en trouver un qui marche.
// L'endpoint v3 "officiel" varie selon la version du compte Sendcloud / les versions de l'API.
const CANDIDATE_ENDPOINTS = [
  "https://panel.sendcloud.sc/api/v3/shipping-methods",
  "https://panel.sendcloud.sc/api/v3/shipping-products",
  "https://panel.sendcloud.sc/api/v3/carriers",
  "https://panel.sendcloud.sc/api/v2/shipping_methods",
];

// Fallback hardcoded si TOUS les endpoints échouent — codes Mondial Relay typiques.
// Le user peut quand même tenter la génération d'étiquette, le backend create-label
// utilise /fetch-shipping-options qui retournera les vrais codes.
const HARDCODED_MONDIAL_FALLBACK = [
  { code: "mondial_relay:home_l", name: "Mondial Relay — Point Relais 24h",  carrier_name: "Mondial Relay", carrier_code: "mondial_relay", contract_id: null, weight_min: null, weight_max: 20, _fallback: true },
];

function normalizeProducts(raw: any[], filter: string): any[] {
  return raw
    .map((p: any) => ({
      code:         p.code ?? p.shipping_product_code ?? p.shipping_option_code ?? p.id ?? null,
      name:         p.name ?? p.label ?? "",
      carrier_name: p.carrier?.name ?? p.carrier ?? p.carrier?.code ?? "",
      carrier_code: p.carrier?.code ?? "",
      contract_id:  p.contract?.id ?? p.contract_id ?? null,
      weight_min:   p.weight?.min ?? p.min_weight ?? null,
      weight_max:   p.weight?.max ?? p.max_weight ?? null,
    }))
    .filter((p: any) => {
      const haystack = `${p.code} ${p.name} ${p.carrier_name} ${p.carrier_code}`.toLowerCase();
      return p.code && haystack.includes(filter);
    });
}

/**
 * GET /api/admin/sendcloud/shipping-products?carrier=mondial
 *
 * Teste plusieurs endpoints Sendcloud en cascade jusqu'à trouver le bon.
 * Logue chaque tentative dans Vercel pour diagnostiquer.
 * Retourne fallback hardcoded si tout échoue.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const filter = (searchParams.get("carrier") ?? "mondial").toLowerCase();

  const attempts: Array<{ endpoint: string; status: number; ok: boolean; body_preview: string; matched_count?: number }> = [];

  for (const endpoint of CANDIDATE_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method:  "GET",
        headers: {
          Authorization: getBasicAuth(),
          Accept:        "application/json",
        },
      });
      const text = await res.text();
      let json: any = null;
      try { json = JSON.parse(text); } catch {}

      const bodyPreview = text.slice(0, 500);
      console.error(`[sendcloud:shipping] ${endpoint} → HTTP ${res.status}`);
      console.error(`[sendcloud:shipping] ${endpoint} body=${bodyPreview}`);

      attempts.push({ endpoint, status: res.status, ok: res.ok, body_preview: bodyPreview });

      if (!res.ok) continue;

      // Normalise selon les formats possibles
      const raw: any[] =
        Array.isArray(json?.data)              ? json.data :
        Array.isArray(json?.shipping_methods)  ? json.shipping_methods :
        Array.isArray(json?.shipping_products) ? json.shipping_products :
        Array.isArray(json?.carriers)          ? json.carriers :
        Array.isArray(json)                    ? json :
        [];

      const products = normalizeProducts(raw, filter);
      attempts[attempts.length - 1].matched_count = products.length;
      console.error(`[sendcloud:shipping] ${endpoint} → ${raw.length} raw, ${products.length} matchés "${filter}"`);

      if (products.length > 0) {
        return Response.json({
          products,
          source:        endpoint,
          total_raw:     raw.length,
          matched:       products.length,
          attempts,
        });
      }
      // Endpoint OK mais 0 produits matchés — on tente le suivant
    } catch (e: any) {
      console.error(`[sendcloud:shipping] ${endpoint} exception:`, e?.message);
      attempts.push({ endpoint, status: 0, ok: false, body_preview: `Exception: ${e?.message ?? "unknown"}` });
    }
  }

  // Tous les endpoints ont échoué ou ne contiennent pas le carrier demandé
  // → fallback hardcoded pour ne pas bloquer l'admin
  console.error(`[sendcloud:shipping] all endpoints failed — using hardcoded fallback for "${filter}"`);
  return Response.json({
    products:    HARDCODED_MONDIAL_FALLBACK,
    source:      "hardcoded_fallback",
    matched:     HARDCODED_MONDIAL_FALLBACK.length,
    attempts,
    warning:     "Aucun endpoint Sendcloud n'a retourné de produits — fallback codes typiques utilisés. Vérifie les logs Vercel pour le détail des tentatives.",
  });
}
