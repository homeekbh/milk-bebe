import { requireAdmin } from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

function getBasicAuth() {
  const pub = process.env.SENDCLOUD_PUBLIC_KEY ?? "";
  const sec = process.env.SENDCLOUD_SECRET_KEY ?? "";
  return "Basic " + Buffer.from(`${pub}:${sec}`).toString("base64");
}

/**
 * GET /api/admin/sendcloud/methods?carrier=mondial
 *
 * Liste les méthodes de livraison Sendcloud disponibles sur ce compte
 * (les IDs/codes réels selon le contrat actif).
 *
 * Diffère de /shipping-products :
 *   - shipping-products: cascade entre plusieurs endpoints + fallback hardcoded
 *   - methods (ici): force v2 /shipping_methods (le plus fiable historiquement)
 *
 * Affiche TOUS les détails dans les logs Vercel pour diagnostiquer les vrais IDs.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // ⚠ TEMP DEBUG — bypass auth via secret en query string.
  // À RETIRER après usage. Apparaît dans les logs Vercel et l'historique navigateur.
  const debugSecret = searchParams.get("secret");
  if (debugSecret !== "milk-debug-2026") {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;
  }

  const filter = (searchParams.get("carrier") ?? "").toLowerCase();

  const endpoint = "https://panel.sendcloud.sc/api/v2/shipping_methods";

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

    console.error(`[sendcloud:methods] ${endpoint} → HTTP ${res.status}`);

    if (!res.ok) {
      console.error(`[sendcloud:methods] error body=${text.slice(0, 1500)}`);
      return Response.json({
        error:            `Sendcloud HTTP ${res.status}`,
        endpoint,
        sendcloud_status: res.status,
        sendcloud_body:   json ?? text.slice(0, 1500),
      }, { status: 502 });
    }

    const methods: any[] = json?.shipping_methods ?? json ?? [];

    // Log COMPLET pour debug — sample 10 premières
    console.error(`[sendcloud:methods] total=${methods.length}`);
    console.error(`[sendcloud:methods] sample=`, JSON.stringify(methods.slice(0, 10).map((m: any) => ({
      id:      m.id,
      name:    m.name,
      carrier: m.carrier,
      min_w:   m.min_weight,
      max_w:   m.max_weight,
      countries: (m.countries ?? []).map((c: any) => c.iso_2).join(","),
    }))));

    const filtered = filter
      ? methods.filter((m: any) => {
          const haystack = `${m.name ?? ""} ${m.carrier ?? ""}`.toLowerCase();
          return haystack.includes(filter);
        })
      : methods;

    console.error(`[sendcloud:methods] filter="${filter}" matched=${filtered.length}`);

    return Response.json({
      endpoint,
      total:     methods.length,
      matched:   filtered.length,
      methods:   filtered.map((m: any) => ({
        id:         m.id,
        name:       m.name,
        carrier:    m.carrier,
        min_weight: m.min_weight,
        max_weight: m.max_weight,
        price:      m.price,
        countries:  (m.countries ?? []).map((c: any) => c.iso_2).filter(Boolean),
      })),
    });
  } catch (e: any) {
    console.error("[sendcloud:methods] exception:", e);
    return Response.json({ error: e.message ?? "Erreur interne" }, { status: 500 });
  }
}
