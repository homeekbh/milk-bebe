import { supabaseServer } from "@/lib/server/supabase";
import { escapeHtml }     from "@/lib/escape-html";
import { Resend } from "resend";
import { rateLimit } from "@/lib/server/rateLimit";
import { getClientIp } from "@/lib/server/client-ip";

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE   = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

export async function POST(req: Request) {
  // Rate limiting (helper partagé + IP fiable Vercel) — 3/min/IP
  if (!rateLimit(getClientIp(req), { max: 3, window: 60 })) {
    return Response.json({ error: "Trop de requêtes. Réessaie dans une minute." }, { status: 429 });
  }

  let body: any;
  try { body = await req.json(); } catch { return Response.json({ error: "Requête invalide" }, { status: 400 }); }
  const { email, source, promo_code } = body ?? {};

  // Validation email stricte
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
  if (!email || !emailRegex.test(email)) {
    return Response.json({ error: "Email invalide" }, { status: 400 });
  }

  // SÉCURITÉ : promo_code validé (alphanumérique majuscule + tiret, 2–30 car.) — rejeté
  // s'il est fourni et malformé. Empêche l'injection HTML/phishing dans l'email de
  // bienvenue. `source` borné (stocké seulement). Défense en profondeur : on échappe
  // quand même à l'interpolation.
  let safePromo: string | null = null;
  if (promo_code != null && String(promo_code).trim() !== "") {
    const pc = String(promo_code).toUpperCase().trim();
    if (!/^[A-Z0-9-]{2,30}$/.test(pc)) {
      return Response.json({ error: "Code promo invalide" }, { status: 400 });
    }
    safePromo = pc;
  }
  const safeSource = String(source ?? "popup").slice(0, 50);

  const token = crypto.randomUUID();

  const { error } = await supabaseServer
    .from("newsletter_subscribers")
    .upsert([{
      email:             email.toLowerCase().trim(),
      source:            safeSource,
      promo_code:        safePromo,
      unsubscribe_token: token,
      active:            true,
    }], { onConflict: "email" })
    .select().single();

  if (error) return Response.json({ error: error.message }, { status: 400 });

  const unsubUrl = `${BASE}/api/newsletter/unsubscribe?token=${token}`;

  const html = `
<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#1a1410;font-family:sans-serif">
<div style="max-width:500px;margin:0 auto;padding:40px 20px;text-align:center">
  <div style="background:#c49a4a;border-radius:12px;padding:12px 24px;display:inline-block;margin-bottom:32px">
    <span style="color:#1a1410;font-weight:950;font-size:22px">M!LK</span>
  </div>
  <h1 style="color:#f2ede6;font-size:24px;font-weight:950;margin:0 0 16px">Bienvenue dans la famille M!LK !</h1>
  <p style="color:rgba(242,237,230,0.55);font-size:15px;line-height:1.7;margin:0 0 28px">
    Merci de rejoindre la communauté M!LK. Tu seras la première informée des nouveautés et offres exclusives.
  </p>
  ${safePromo ? `
  <div style="background:#2a2018;border-radius:16px;padding:24px;margin-bottom:28px;border:1px solid rgba(196,154,74,0.2)">
    <div style="font-size:13px;color:rgba(242,237,230,0.4);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">Ton code de bienvenue</div>
    <div style="font-size:28px;font-weight:950;color:#c49a4a;font-family:monospace;letter-spacing:2px">${escapeHtml(safePromo)}</div>
    <div style="font-size:13px;color:rgba(242,237,230,0.4);margin-top:8px">À utiliser sur milkbebe.fr</div>
  </div>
  <a href="${BASE}/fr/produits" style="display:inline-block;background:#f2ede6;color:#1a1410;padding:14px 32px;border-radius:12px;font-weight:900;font-size:15px;text-decoration:none;margin-bottom:28px">
    Utiliser mon code →
  </a>` : `
  <a href="${BASE}/fr/produits" style="display:inline-block;background:#f2ede6;color:#1a1410;padding:14px 32px;border-radius:12px;font-weight:900;font-size:15px;text-decoration:none;margin-bottom:28px">
    Découvrir la collection →
  </a>`}
  <div style="font-size:11px;color:rgba(242,237,230,0.2);line-height:1.8">
    M!LK — Essentiels bébé en bambou premium<br>
    <a href="${unsubUrl}" style="color:rgba(242,237,230,0.2);text-decoration:underline">Se désabonner</a>
  </div>
</div>
</body>
</html>`;

  await resend.emails.send({
    from:    "M!LK <contact@milkbebe.fr>",
    to:      email,
    subject: safePromo ? `🎁 Ton code promo M!LK : ${safePromo}` : "Bienvenue chez M!LK !",
    html,
  }).catch(e => console.error("Newsletter email error:", e));

  return Response.json({ ok: true });
}