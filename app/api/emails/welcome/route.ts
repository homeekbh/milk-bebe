import { Resend } from "resend";
import { rateLimit } from "@/lib/server/rateLimit";
import { getClientIp } from "@/lib/server/client-ip";
import { supabaseServer } from "@/lib/server/supabase";

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE   = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function welcomeTemplate(prenom: string): string {
  const safePrenom = escapeHtml(prenom?.trim() || "");
  const greeting   = safePrenom ? `Bienvenue ${safePrenom}` : "Bienvenue";

  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0b09;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:600px;margin:0 auto;padding:40px 20px">

  <!-- Logo M!LK -->
  <div style="text-align:center;margin-bottom:40px">
    <div style="display:inline-block;background:#c49a4a;border-radius:12px;padding:14px 28px">
      <span style="color:#1a1410;font-weight:950;font-size:22px;letter-spacing:-1px">M!LK</span>
    </div>
  </div>

  <!-- Hero bienvenue -->
  <div style="background:#1a1410;border-radius:20px;border:1px solid rgba(242,237,230,0.08);padding:48px 36px;margin-bottom:20px;text-align:center">
    <div style="font-size:48px;margin-bottom:20px">🌿</div>
    <h1 style="margin:0 0 14px;color:#f2ede6;font-size:30px;font-weight:950;letter-spacing:-1px;line-height:1.15">
      ${greeting} chez M!LK
    </h1>
    <p style="margin:0;color:rgba(242,237,230,0.55);font-size:16px;line-height:1.75">
      Merci d'avoir rejoint la famille M!LK.<br>
      Des essentiels bébé en bambou certifié OEKO-TEX, pensés pour le quotidien.
    </p>
  </div>

  <!-- Univers M!LK -->
  <div style="background:#1a1410;border-radius:16px;border:1px solid rgba(242,237,230,0.08);padding:32px 28px;margin-bottom:20px">
    <div style="font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#c49a4a;margin-bottom:18px">L'univers M!LK</div>
    <div style="color:#f2ede6;font-size:15px;line-height:1.8;margin-bottom:8px">
      <strong style="color:#c49a4a">Bambou premium</strong> — 3× plus doux que le coton, thermorégulant, antibactérien naturel.
    </div>
    <div style="color:#f2ede6;font-size:15px;line-height:1.8;margin-bottom:8px">
      <strong style="color:#c49a4a">OEKO-TEX Standard 100</strong> — zéro substance nocive, testé pour la peau fragile des nouveau-nés.
    </div>
    <div style="color:#f2ede6;font-size:15px;line-height:1.8">
      <strong style="color:#c49a4a">Pensé par une maman</strong> — Erika, deux garçons, conçoit chaque produit pour réduire ta charge mentale.
    </div>
  </div>

  <!-- CTA collection -->
  <div style="background:#1a1410;border-radius:16px;border:1px solid rgba(196,154,74,0.2);padding:32px;margin-bottom:20px;text-align:center">
    <div style="color:#f2ede6;font-size:18px;font-weight:900;margin-bottom:10px">Découvre la collection</div>
    <div style="color:rgba(242,237,230,0.55);font-size:14px;line-height:1.7;margin-bottom:24px">
      Bodies, pyjamas, gigoteuses, langes et accessoires<br>
      pour les 0 à 6 mois.
    </div>
    <a href="${BASE}/fr/produits" style="display:inline-block;background:#c49a4a;color:#1a1410;padding:14px 32px;border-radius:12px;font-weight:900;font-size:15px;text-decoration:none">
      Voir les produits →
    </a>
  </div>

  <!-- Livraison + retour -->
  <div style="background:#1a1410;border-radius:16px;border:1px solid rgba(242,237,230,0.08);padding:24px 28px;margin-bottom:20px">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div>
        <div style="font-size:24px;margin-bottom:6px">🚚</div>
        <div style="color:#f2ede6;font-size:14px;font-weight:800;margin-bottom:3px">Livraison offerte</div>
        <div style="color:rgba(242,237,230,0.45);font-size:13px">dès 60€ d'achat</div>
      </div>
      <div>
        <div style="font-size:24px;margin-bottom:6px">↩️</div>
        <div style="color:#f2ede6;font-size:14px;font-weight:800;margin-bottom:3px">Retour</div>
        <div style="color:rgba(242,237,230,0.45);font-size:13px">sous 14 jours</div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div style="text-align:center;padding:24px 20px;color:rgba(242,237,230,0.25);font-size:12px;line-height:1.7">
    M!LK — Essentiels bébé bambou OEKO-TEX<br>
    <a href="${BASE}/fr" style="color:rgba(242,237,230,0.4);text-decoration:none">milkbebe.fr</a> · contact@milkbebe.fr
  </div>

</div>
</body>
</html>`;
}

/**
 * POST /api/emails/welcome
 * Body : { email: string, prenom?: string }
 *
 * Envoyé après création de compte via supabase.auth.signUp depuis
 * app/inscription/page.tsx. Fire-and-forget côté client — pas de blocage
 * de l'UX si l'envoi échoue.
 *
 * Protection : rate limit 5/h par IP (suffit contre l'abus, transparent
 * en usage légitime). Si besoin de durcir : vérifier que l'email existe
 * dans auth.users via service_role avant d'envoyer.
 */
export async function POST(req: Request) {
  // Rate limiting (helper partagé + IP fiable Vercel) — 5/heure/IP
  if (!rateLimit(getClientIp(req), { max: 5, window: 3600 })) {
    return Response.json({ error: "Trop de requêtes." }, { status: 429 });
  }

  let body: any = {};
  try { body = await req.json(); } catch {}

  const email  = String(body?.email ?? "").trim().toLowerCase();
  const prenom = String(body?.prenom ?? "").trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Email invalide" }, { status: 400 });
  }

  // Anti joe-jobbing : n'envoyer le mail de bienvenue QUE si l'email correspond à un compte
  // réellement créé (profiles est écrit à l'inscription avec l'uid du compte — un attaquant ne
  // peut pas créer un profil pour l'email d'autrui). Sinon on ne fait rien (best-effort, jamais
  // d'erreur), ce qui empêche l'envoi de « Bienvenue » non sollicités vers des adresses arbitraires.
  const { data: prof } = await supabaseServer.from("profiles").select("id").eq("email", email).maybeSingle();
  if (!prof) return Response.json({ ok: true, skipped: "no_account" });

  try {
    const { error } = await resend.emails.send({
      from:    "M!LK <contact@milkbebe.fr>",
      to:      email,
      subject: "Bienvenue chez M!LK 🌿",
      html:    welcomeTemplate(prenom),
    });
    if (error) {
      console.error("[emails/welcome] resend error:", error);
      return Response.json({ error: "Envoi échoué" }, { status: 502 });
    }
    return Response.json({ ok: true });
  } catch (e: any) {
    console.error("[emails/welcome] exception:", e?.message);
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
