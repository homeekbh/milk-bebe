import { supabaseServer } from "@/lib/server/supabase";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE   = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

export async function POST(req: Request) {
  const { email, source, promo_code } = await req.json();
  if (!email || !email.includes("@")) return Response.json({ error: "Email invalide" }, { status: 400 });

  const token = crypto.randomUUID();

  const { error } = await supabaseServer
    .from("newsletter_subscribers")
    .upsert([{
      email:             email.toLowerCase().trim(),
      source:            source     ?? "popup",
      promo_code:        promo_code ?? null,
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
  ${promo_code ? `
  <div style="background:#2a2018;border-radius:16px;padding:24px;margin-bottom:28px;border:1px solid rgba(196,154,74,0.2)">
    <div style="font-size:13px;color:rgba(242,237,230,0.4);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">Ton code de bienvenue</div>
    <div style="font-size:28px;font-weight:950;color:#c49a4a;font-family:monospace;letter-spacing:2px">${promo_code}</div>
    <div style="font-size:13px;color:rgba(242,237,230,0.4);margin-top:8px">À utiliser sur milkbebe.fr</div>
  </div>
  <a href="${BASE}/produits" style="display:inline-block;background:#f2ede6;color:#1a1410;padding:14px 32px;border-radius:12px;font-weight:900;font-size:15px;text-decoration:none;margin-bottom:28px">
    Utiliser mon code →
  </a>` : `
  <a href="${BASE}/produits" style="display:inline-block;background:#f2ede6;color:#1a1410;padding:14px 32px;border-radius:12px;font-weight:900;font-size:15px;text-decoration:none;margin-bottom:28px">
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
    subject: promo_code ? `🎁 Ton code promo M!LK : ${promo_code}` : "Bienvenue chez M!LK !",
    html,
  }).catch(e => console.error("Newsletter email error:", e));

  return Response.json({ ok: true });
}