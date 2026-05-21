import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import { Resend } from "resend";
import type { NextRequest } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE   = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

export async function POST(req: NextRequest) {
  const { email, product_id, product_name, product_slug, taille } = await req.json();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return Response.json({ error: "Email invalide" }, { status: 400 });
  }
  if (!product_id || !product_name) {
    return Response.json({ error: "Produit manquant" }, { status: 400 });
  }

  // Upsert dans stock_alerts — évite les doublons
  const { error } = await supabaseServer
    .from("stock_alerts")
    .upsert([{
      email:        email.toLowerCase().trim(),
      product_id,
      product_name,
      product_slug: product_slug ?? null,
      taille:       taille ?? null,
      notified:     false,
    }], { onConflict: "email,product_id,taille" });

  if (error) return Response.json({ error: error.message }, { status: 400 });

  // Email de confirmation
  const tailleLabel = taille ? ` — taille ${taille}` : "";
  await resend.emails.send({
    from:    "M!LK <contact@milkbebe.fr>",
    to:      email,
    subject: `🔔 On te prévient dès le retour en stock — ${product_name}${tailleLabel}`,
    html: `
<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#1a1410;font-family:sans-serif">
<div style="max-width:500px;margin:0 auto;padding:40px 20px;text-align:center">
  <div style="background:#c49a4a;border-radius:12px;padding:12px 24px;display:inline-block;margin-bottom:32px">
    <span style="color:#1a1410;font-weight:950;font-size:22px">M!LK</span>
  </div>
  <h1 style="color:#f2ede6;font-size:22px;font-weight:950;margin:0 0 16px">Alerte réassort enregistrée !</h1>
  <p style="color:rgba(242,237,230,0.6);font-size:15px;line-height:1.7;margin:0 0 24px">
    On te préviendra dès que <strong style="color:#f2ede6">${product_name}${tailleLabel}</strong> sera de nouveau disponible.
  </p>
  <a href="${BASE}/produits/${product_slug ?? ""}"
    style="display:inline-block;background:#f2ede6;color:#1a1410;padding:14px 32px;border-radius:12px;font-weight:900;font-size:15px;text-decoration:none">
    Voir le produit →
  </a>
  <p style="color:rgba(242,237,230,0.25);font-size:11px;margin-top:32px;line-height:1.8">
    M!LK — Essentiels bébé en bambou premium<br>
    Tu recevras un email dès le retour en stock.
  </p>
</div>
</body>
</html>`,
  }).catch(e => console.error("Stock alert email error:", e));

  return Response.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { data, error } = await supabaseServer
    .from("stock_alerts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}