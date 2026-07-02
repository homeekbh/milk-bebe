import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/server/supabase";

/**
 * POST /api/avis/submit  (application/x-www-form-urlencoded)
 *
 * Handler du formulaire d'avis rendu 100 % SERVEUR (aucun JS requis) — seul moyen
 * fiable de fonctionner dans les webviews d'apps mail qui sandboxent le JS.
 *
 * Sécurité (form POST public qui écrit en base) :
 *   - order_id + email revalidés serveur : le couple doit exister, correspondre,
 *     et la commande être expédiée/livrée.
 *   - product_id doit appartenir aux items de CETTE commande.
 *   - Anti-doublon (order_id, product_id) applicatif + index unique DB.
 *   - Consentement RGPD obligatoire.
 *   - Honeypot anti-bot (champ caché "website").
 *   - Rate-limit IP.
 *   - approved:false (modération). AUCUNE valeur du form n'est crue pour l'auth.
 *
 * PRG : réponse toujours en 303 (GET après POST) → refresh ne resoumet pas.
 */

export const dynamic = "force-dynamic";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

// Rate-limit mémoire (par instance serverless — même approche que /api/reviews).
const rlMap = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const e = rlMap.get(ip);
  if (!e || now > e.resetAt) { rlMap.set(ip, { count: 1, resetAt: now + 60_000 }); return false; }
  if (e.count >= 6) return true;   // ≥6 POST/min = spam ; laisse la marge aux retries légitimes
  e.count++;
  return false;
}

function redirect(path: string, status = 303) {
  return NextResponse.redirect(new URL(path, BASE), status);
}

// Retour vers le form avec un code d'erreur (la page réaffiche un bandeau + le contexte).
function backWithError(locale: string, orderId: string, email: string, productId: string, code: string) {
  const qs = new URLSearchParams({ order_id: orderId, email, product_id: productId, err: code });
  return redirect(`/${locale}/avis?${qs.toString()}`);
}

export async function POST(req: Request) {
  const form = await req.formData();

  const localeRaw   = String(form.get("locale") ?? "fr");
  const locale      = localeRaw === "en" ? "en" : "fr";
  const orderId     = String(form.get("order_id") ?? "").trim();
  const email       = String(form.get("email") ?? "").trim().toLowerCase();
  const productId   = String(form.get("product_id") ?? "").trim();
  const name        = String(form.get("customer_name") ?? "").trim();
  const rating      = Number(form.get("rating") ?? 0);
  const comment     = String(form.get("comment") ?? "").trim();
  const consent     = String(form.get("consent") ?? "");
  const honeypot    = String(form.get("website") ?? "").trim();

  // 1. Honeypot → bot. Rejet SILENCIEUX : on ne write pas, on renvoie vers "merci"
  //    pour ne pas révéler le piège.
  if (honeypot) return redirect(`/${locale}/avis/merci`);

  // 2. Champs requis
  if (!orderId || !email || !productId || !name || !rating) {
    return backWithError(locale, orderId, email, productId, "missing");
  }

  // 3. Consentement RGPD obligatoire
  if (consent !== "on") {
    return backWithError(locale, orderId, email, productId, "consent");
  }

  // 4. Note valide
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return backWithError(locale, orderId, email, productId, "rating");
  }

  // 5. Rate-limit
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (isRateLimited(ip)) {
    return backWithError(locale, orderId, email, productId, "rate");
  }

  // 6. Revalidation serveur order_id + email
  const { data: order } = await supabaseServer
    .from("orders")
    .select("id, customer_email, shipping_status, items")
    .eq("id", orderId)
    .maybeSingle();

  if (
    !order ||
    (order.customer_email ?? "").toLowerCase() !== email ||
    !["expediee", "livree"].includes(order.shipping_status)
  ) {
    return backWithError(locale, orderId, email, productId, "invalid");
  }

  // 7. product_id doit appartenir à CETTE commande
  const items = Array.isArray(order.items) ? order.items : [];
  const productInOrder = items.some((it: any) => (it?.product_id ?? it?.id) === productId);
  if (!productInOrder) {
    return backWithError(locale, orderId, email, productId, "invalid");
  }

  // 8. Anti-doublon applicatif (order_id, product_id)
  const { data: existing } = await supabaseServer
    .from("reviews")
    .select("id")
    .eq("order_id", order.id)
    .eq("product_id", productId)
    .limit(1)
    .maybeSingle();
  if (existing) {
    return backWithError(locale, orderId, email, productId, "dup");
  }

  // 9. Insertion (approved:false → modération)
  const { error } = await supabaseServer
    .from("reviews")
    .insert([{
      order_id:       order.id,
      product_id:     productId,
      customer_email: (order.customer_email ?? email).toLowerCase(),
      customer_name:  name.slice(0, 100),
      rating,
      comment:        comment ? comment.slice(0, 1000) : null,
      approved:       false,
    }]);

  if (error) {
    // 23505 = violation d'unicité (course double-clic captée par l'index DB).
    if ((error as any).code === "23505") {
      return backWithError(locale, orderId, email, productId, "dup");
    }
    return backWithError(locale, orderId, email, productId, "server");
  }

  // 10. Succès → PRG vers la page de remerciement
  return redirect(`/${locale}/avis/merci`);
}
