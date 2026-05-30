import type { NextRequest } from "next/server";
import { validatePromoCode } from "@/lib/promo-validate";

// Rate limiting simple en mémoire (10 tentatives / minute / IP)
const attempts = new Map<string, { count: number; reset: number }>();

function checkRateLimit(ip: string): boolean {
  const now  = Date.now();
  const data = attempts.get(ip);
  if (!data || now > data.reset) {
    attempts.set(ip, { count: 1, reset: now + 60_000 });
    return true;
  }
  if (data.count >= 10) return false;
  data.count++;
  return true;
}

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
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
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
    new_total:                Math.max(0, total - result.discount),
  });
}
