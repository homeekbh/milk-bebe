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

  let discount     = 0;
  let free_shipping = false;

  if (promoType === "percent") {
    discount = Math.round((total * promoValue) / 100 * 100) / 100;
  } else if (promoType === "fixed") {
    discount = Math.min(promoValue, total);
  } else if (promoType === "free_shipping") {
    free_shipping = true;
    discount      = 4.90;
  }

  return Response.json({
    valid:         true,
    code:          data.code,
    type:          promoType,
    value:         promoValue,
    discount,
    free_shipping,
    new_total:     Math.max(0, total - discount),
  });
}