import { supabaseServer } from "@/lib/server/supabase";
import { cookieIsInternal } from "@/lib/internal-traffic";
import { getClientIp } from "@/lib/server/client-ip";

export const dynamic = "force-dynamic";

/**
 * POST /api/analytics/event — collecte d'events analytics internes (public).
 *
 * Body JSON (tous optionnels sauf event_type) :
 *   { event_type, session_id?, product_id?, order_id?, value?, currency?,
 *     metadata?, page_path?, referrer? }
 *
 * - Écriture dans analytics_events via service_role.
 * - Rate limit en mémoire : 100 insertions / 60s / IP (Map + TTL).
 * - Répond 200 immédiatement, même en cas d'échec (jamais bloquant pour l'UX).
 * - Aucune validation stricte : champ manquant → null, pas de 400.
 */

type Bucket = { count: number; reset: number };
const ipBuckets = new Map<string, Bucket>();
const LIMIT  = 100;
const WINDOW = 60_000;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const b   = ipBuckets.get(ip);
  if (!b || now > b.reset) {
    ipBuckets.set(ip, { count: 1, reset: now + WINDOW });
    // Nettoyage opportuniste des buckets expirés (évite la fuite mémoire).
    if (ipBuckets.size > 5000) {
      for (const [k, v] of ipBuckets) if (now > v.reset) ipBuckets.delete(k);
    }
    return false;
  }
  b.count++;
  return b.count > LIMIT;
}

// product_id / order_id sont des FK UUID. On ne pose la valeur que si elle
// ressemble à un UUID — sinon on la garde dans metadata (ex: "pack:xxx").
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function uuidOrNull(v: any): string | null {
  return typeof v === "string" && UUID_RE.test(v) ? v : null;
}

export async function POST(req: Request) {
  try {
    // Trafic interne (cookie posé via ?internal=milk2026) → aucun event enregistré.
    if (cookieIsInternal(req.headers.get("cookie"))) return Response.json({ ok: true, skipped: "internal" });

    // IP fiable (getClientIp : x-real-ip puis DERNIER segment XFF, non usurpable sur Vercel).
    // Le 1er segment XFF est fourni par le client → contournement trivial du rate-limit.
    const ip = getClientIp(req);
    if (rateLimited(ip)) return Response.json({ ok: true, skipped: "rate_limited" });

    const body: any = await req.json().catch(() => ({}));
    const ua = req.headers.get("user-agent") ?? null;

    const productId = uuidOrNull(body.product_id);
    const orderId   = uuidOrNull(body.order_id);

    const metadata = { ...(body.metadata && typeof body.metadata === "object" ? body.metadata : {}) };
    // On préserve les refs non-UUID dans metadata pour ne rien perdre.
    if (body.product_id && !productId) metadata.product_ref = body.product_id;
    if (body.order_id   && !orderId)   metadata.order_ref   = body.order_id;

    const row = {
      event_type: typeof body.event_type === "string" ? body.event_type : "unknown",
      session_id: body.session_id ?? null,
      product_id: productId,
      order_id:   orderId,
      value:      typeof body.value === "number" ? body.value : null,
      currency:   typeof body.currency === "string" ? body.currency : "EUR",
      metadata,
      page_path:  body.page_path ?? null,
      referrer:   body.referrer ?? null,
      user_agent: ua,
    };

    // Fire-and-forget : on ne bloque pas la réponse sur l'insertion.
    supabaseServer
      .from("analytics_events")
      .insert([row])
      .then(({ error }: any) => {
        if (error) console.error("[analytics/event] insert:", error.message);
      });

    return Response.json({ ok: true });
  } catch {
    // Ne jamais renvoyer d'erreur au client analytics.
    return Response.json({ ok: true });
  }
}
