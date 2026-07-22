import type { NextRequest } from "next/server";
import { validatePromoCode } from "@/lib/promo-validate";
import { rateLimit } from "@/lib/server/rateLimit";
import { getClientIp } from "@/lib/server/client-ip";

/**
 * POST /api/promo/validate
 * Body : { code: string, order_total: number }
 *
 * Validation temps réel d'un code promo pour l'affichage panier. Délègue
 * la logique métier à lib/promo-validate.ts (source unique partagée avec
 * /api/checkout/create-session qui re-valide côté serveur).
 *
 * IMPORTANT : la réponse `free_shipping` ne reflète QUE le code lui-même.
 * Le seuil free_shipping_threshold est appliqué côté UI (panier) via
 * computeShipping() — la "vraie" décision finale est dans computeShipping.
 */
export async function POST(req: NextRequest) {
  // Anti-énumération des codes promo — 10/min/IP (helper partagé + IP fiable Vercel).
  if (!rateLimit(getClientIp(req), { max: 10, window: 60 })) {
    return Response.json({ error: "Trop de tentatives, réessaie dans 1 minute" }, { status: 429 });
  }

  let body: { code?: string; order_total?: number | string } = {};
  try { body = await req.json(); } catch {}

  const code  = String(body.code ?? "").trim();
  const total = Number.parseFloat(String(body.order_total ?? "0")) || 0;

  const result = await validatePromoCode(code, total);
  if (!result.valid) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({
    valid:                    true,
    code:                     result.code,
    type:                     result.type,
    value:                    result.value,
    discount:                 result.discount,
    free_shipping:            result.free_shipping,
    cumulable_avec_livraison: result.cumulable_avec_livraison,
    cumulable:                result.cumulable,        // cumul avec d'autres codes (étape 21)
    cumulable_codes:          result.cumulable_codes,  // codes compatibles déclarés
    new_total:                Math.max(0, total - result.discount),
  });
}
