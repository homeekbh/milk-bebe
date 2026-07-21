import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import { escapeHtml }     from "@/lib/escape-html";
import { Resend } from "resend";
import { rateLimit } from "@/lib/server/rateLimit";
import { getClientIp } from "@/lib/server/client-ip";
import type { NextRequest } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE   = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

export async function POST(req: NextRequest) {
  // Rate limiting (helper partagé + IP fiable Vercel) — 5/min/IP.
  if (!rateLimit(getClientIp(req), { max: 5, window: 60 })) {
    return Response.json({ error: "Trop de requêtes. Réessaie dans une minute." }, { status: 429 });
  }

  const { email, product_id, taille } = await req.json();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return Response.json({ error: "Email invalide" }, { status: 400 });
  }
  if (!product_id) {
    return Response.json({ error: "Produit manquant" }, { status: 400 });
  }

  // SÉCURITÉ : nom + slug dérivés de la DB (source de vérité), JAMAIS du body.
  // Empêche l'injection HTML / le vecteur phishing dans l'email signé M!LK.
  const { data: product } = await supabaseServer
    .from("products").select("name, slug, sizes").eq("id", product_id).single();
  if (!product) {
    return Response.json({ error: "Produit introuvable" }, { status: 400 });
  }
  const productName = String(product.name ?? "");
  const productSlug = String(product.slug ?? "");
  // taille : conservée seulement si elle appartient réellement au produit, sinon ignorée.
  const sizes: string[] = Array.isArray(product.sizes) ? product.sizes.map(String) : [];
  const safeTaille = taille && sizes.includes(String(taille)) ? String(taille) : null;

  const emailClean = email.toLowerCase().trim();

  // On n'enverra l'email de confirmation QUE pour une NOUVELLE alerte (ligne réellement
  // insérée) → tue l'email-bombing par POST répété du même (email, product_id, taille).
  // SELECT préalable, null-aware sur la taille (.eq ne compare pas NULL correctement).
  let existQ = supabaseServer.from("stock_alerts").select("id")
    .eq("email", emailClean).eq("product_id", product_id);
  existQ = safeTaille === null ? existQ.is("taille", null) : existQ.eq("taille", safeTaille);
  const { data: existingAlert } = await existQ.maybeSingle();
  const isNewAlert = !existingAlert;

  // Upsert dans stock_alerts — évite les doublons. On stocke les valeurs DERIVÉES.
  const { error } = await supabaseServer
    .from("stock_alerts")
    .upsert([{
      email:        emailClean,
      product_id,
      product_name: productName,
      product_slug: productSlug || null,
      taille:       safeTaille,
      notified:     false,
    }], { onConflict: "email,product_id,taille" });

  if (error) return Response.json({ error: error.message }, { status: 400 });

  // Email de confirmation — UNIQUEMENT pour une nouvelle alerte (anti email-bombing).
  // Toutes les valeurs sont ÉCHAPPÉES avant interpolation.
  const tailleLabel = safeTaille ? ` — taille ${escapeHtml(safeTaille)}` : "";
  if (isNewAlert) await resend.emails.send({
    from:    "M!LK <contact@milkbebe.fr>",
    to:      email,
    subject: `🔔 On te prévient dès le retour en stock — ${productName}${safeTaille ? ` — taille ${safeTaille}` : ""}`,
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
    On te préviendra dès que <strong style="color:#f2ede6">${escapeHtml(productName)}${tailleLabel}</strong> sera de nouveau disponible.
  </p>
  <a href="${BASE}/fr/produits/${escapeHtml(productSlug)}"
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