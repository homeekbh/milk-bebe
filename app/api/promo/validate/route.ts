import { supabaseServer } from "@/lib/server/supabase";
import type { NextRequest } from "next/server";

// Rate limiting simple en mémoire
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

// Coût livraison maximum à couvrir si un code free_shipping est appliqué.
// Aligné sur DELIVERY_PRICES.colissimo.home = 7.70€ (le plus cher de la
// matrice). Comme on ne sait pas encore quel transporteur sera choisi
// par le client au moment de la validation du code, on couvre le max
// pour éviter qu'il paie une différence.
const MAX_DELIVERY_COST = 7.70;

async function getFreeShippingThreshold(): Promise<number> {
  try {
    const { data } = await supabaseServer
      .from("settings")
      .select("value")
      .eq("key", "free_shipping_threshold")
      .single();
    const n = Number(data?.value);
    return Number.isFinite(n) ? n : 60;
  } catch {
    return 60;
  }
}

export async function POST(req: NextRequest) {
  // Rate limiting
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return Response.json({ error: "Trop de tentatives, réessaie dans 1 minute" }, { status: 429 });
  }

  const { code, order_total } = await req.json();
  if (!code) return Response.json({ error: "Code manquant" }, { status: 400 });

  const { data, error } = await supabaseServer
    .from("promo_codes")
    .select("*")
    .eq("code", code.toUpperCase().trim())
    .eq("active", true)
    .single();

  if (error || !data) {
    return Response.json({ error: "Code invalide ou expiré" }, { status: 404 });
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return Response.json({ error: "Ce code a expiré" }, { status: 400 });
  }

  if (data.starts_at && new Date(data.starts_at) > new Date()) {
    return Response.json({ error: "Ce code n'est pas encore actif" }, { status: 400 });
  }

  if (data.max_uses !== null && data.uses_count >= data.max_uses) {
    return Response.json({ error: "Ce code a atteint son nombre maximum d'utilisations" }, { status: 400 });
  }

  const total = parseFloat(order_total) || 0;

  if (data.min_order && total < data.min_order) {
    return Response.json({ error: `Montant minimum requis : ${Number(data.min_order).toFixed(2)} €` }, { status: 400 });
  }

  // ✅ Fix : supporter "type" ET "discount_type"
  const promoType  = data.type ?? data.discount_type ?? "";
  const promoValue = Number(data.value ?? data.discount_value ?? 0);

  let discount      = 0;
  let free_shipping = false;

  // Type principal : pourcentage / fixe / livraison offerte
  if (promoType === "percent") {
    discount = Math.round((total * promoValue) / 100 * 100) / 100;
  } else if (promoType === "fixed") {
    discount = Math.min(promoValue, total);
  } else if (promoType === "free_shipping") {
    free_shipping = true;
    discount      = MAX_DELIVERY_COST;
  }

  // Flag free_shipping ORTHOGONAL au type — un code % ou € peut aussi
  // offrir la livraison via cette case à cocher (migration 004).
  if (data.free_shipping === true) {
    free_shipping = true;
    // Pour les codes %/€ qui cochent free_shipping, on garde le discount
    // sur les produits ET on met free_shipping=true. La livraison sera
    // mise à 0 côté checkout.
  }

  // Cumul livraison automatique : si commande ≥ seuil ET le code n'interdit
  // pas le cumul → la livraison est offerte d'office (même si free_shipping
  // n'est pas coché sur le code).
  const threshold = await getFreeShippingThreshold();
  const totalAfterDiscount = Math.max(0, total - (promoType === "free_shipping" ? 0 : discount));
  const cumulOk = data.cumulable_avec_livraison !== false; // null/undefined/true → cumul OK
  if (cumulOk && totalAfterDiscount >= threshold) {
    free_shipping = true;
  }

  return Response.json({
    valid:         true,
    code:          data.code,
    type:          promoType,
    value:         promoValue,
    discount,
    free_shipping,
    new_total:     Math.max(0, total - discount),
    // Métadonnées utiles pour debug / UI
    meta: {
      free_shipping_from_type:       promoType === "free_shipping",
      free_shipping_from_flag:       data.free_shipping === true,
      free_shipping_from_threshold:  cumulOk && totalAfterDiscount >= threshold,
      threshold,
      cumulable_avec_livraison:      cumulOk,
    },
  });
}
