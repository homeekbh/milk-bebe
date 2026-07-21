import { Resend } from "resend";
import { requireAdmin } from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE   = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

// Adresse de retour M!LK — fixe, jamais paramétrable côté API pour éviter
// qu'un client ne reçoive une adresse falsifiée via injection.
const RETURN_ADDRESS = {
  name:        "M!LK",
  line1:       "6 impasse des Cabrolles",
  postal_code: "06500",
  city:        "Menton",
  country:     "France",
};

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtml(opts: {
  prenom?:         string;
  order_number?:   string;
  custom_message?: string;
}): string {
  const { prenom, order_number, custom_message } = opts;
  const numero = order_number ? `#${escapeHtml(order_number.toString().slice(0, 8).toUpperCase())}` : "";
  const titrePrenom = prenom ? `${escapeHtml(prenom)}, instructions de retour` : "Instructions de retour";

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#1a1410;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px">
    <div style="text-align:center;margin-bottom:32px">
      <div style="display:inline-block;background:#c49a4a;border-radius:12px;padding:14px 28px">
        <span style="color:#1a1410;font-weight:950;font-size:24px;letter-spacing:-1px">M!LK</span>
      </div>
    </div>

    <div style="background:#2a2018;border-radius:20px;padding:32px;border:1px solid rgba(242,237,230,0.08);margin-bottom:20px">
      <h1 style="margin:0 0 8px;color:#f2ede6;font-size:22px;font-weight:950;letter-spacing:-0.5px">
        ${titrePrenom}
      </h1>
      ${numero ? `<div style="font-family:monospace;color:#c49a4a;font-size:13px;font-weight:800;margin-bottom:18px;letter-spacing:1px">Commande ${numero}</div>` : ""}
      <p style="margin:0 0 14px;color:rgba(242,237,230,0.7);font-size:15px;line-height:1.7">
        Vous souhaitez retourner votre commande M!LK. Voici la marche à suivre :
      </p>
    </div>

    <!-- Étapes -->
    <div style="background:#2a2018;border-radius:20px;padding:28px;border:1px solid rgba(242,237,230,0.08);margin-bottom:20px">
      <div style="display:grid;gap:18px">
        <!-- Étape 1 -->
        <div style="display:flex;gap:14px;align-items:flex-start">
          <div style="flex-shrink:0;width:32px;height:32px;border-radius:50%;background:#c49a4a;color:#1a1410;font-weight:950;font-size:16px;display:flex;align-items:center;justify-content:center;line-height:1">1</div>
          <div style="flex:1">
            <div style="color:#f2ede6;font-weight:900;font-size:15px;margin-bottom:4px">Préparez le colis</div>
            <div style="color:rgba(242,237,230,0.65);font-size:13px;line-height:1.6">
              Article(s) dans leur <strong>état d'origine</strong>, non porté(s), non lavé(s), avec leur emballage. Glissez à l'intérieur une note avec votre numéro de commande.
            </div>
          </div>
        </div>

        <!-- Étape 2 -->
        <div style="display:flex;gap:14px;align-items:flex-start">
          <div style="flex-shrink:0;width:32px;height:32px;border-radius:50%;background:#c49a4a;color:#1a1410;font-weight:950;font-size:16px;display:flex;align-items:center;justify-content:center;line-height:1">2</div>
          <div style="flex:1">
            <div style="color:#f2ede6;font-weight:900;font-size:15px;margin-bottom:4px">Affranchissez en Colissimo</div>
            <div style="color:rgba(242,237,230,0.65);font-size:13px;line-height:1.6">
              Achetez une étiquette Colissimo <strong>avec suivi</strong> en bureau de poste, sur laposte.fr ou via une borne automatique.
              <span style="color:#c49a4a;font-weight:700">Les frais de retour sont à votre charge.</span>
              Conservez précieusement le numéro de suivi.
            </div>
          </div>
        </div>

        <!-- Étape 3 -->
        <div style="display:flex;gap:14px;align-items:flex-start">
          <div style="flex-shrink:0;width:32px;height:32px;border-radius:50%;background:#c49a4a;color:#1a1410;font-weight:950;font-size:16px;display:flex;align-items:center;justify-content:center;line-height:1">3</div>
          <div style="flex:1">
            <div style="color:#f2ede6;font-weight:900;font-size:15px;margin-bottom:4px">Déposez ou faites enlever</div>
            <div style="color:rgba(242,237,230,0.65);font-size:13px;line-height:1.6">
              Déposez le colis en bureau de poste, en Point Relais Colissimo, ou faites-le enlever à domicile.
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Adresse de retour -->
    <div style="background:#1a1410;border:2px solid #c49a4a;border-radius:16px;padding:24px;margin-bottom:20px">
      <div style="font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#c49a4a;margin-bottom:10px">📦 Adresse de retour</div>
      <div style="color:#f2ede6;font-size:16px;font-weight:900;line-height:1.6">
        ${escapeHtml(RETURN_ADDRESS.name)}<br>
        ${escapeHtml(RETURN_ADDRESS.line1)}<br>
        ${escapeHtml(RETURN_ADDRESS.postal_code)} ${escapeHtml(RETURN_ADDRESS.city)}<br>
        ${escapeHtml(RETURN_ADDRESS.country)}
      </div>
    </div>

    <!-- Conditions -->
    <div style="background:#2a2018;border-radius:16px;padding:22px;border:1px solid rgba(242,237,230,0.08);margin-bottom:20px">
      <div style="font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#c49a4a;margin-bottom:10px">Conditions</div>
      <ul style="margin:0;padding-left:20px;color:rgba(242,237,230,0.7);font-size:13px;line-height:1.8">
        <li><strong style="color:#f2ede6">Délai : 14 jours</strong> à compter de la réception de votre commande</li>
        <li><strong style="color:#f2ede6">Frais de retour</strong> à votre charge (Colissimo recommandé pour le suivi)</li>
        <li>Remboursement effectué sous <strong style="color:#f2ede6">14 jours</strong> après réception, sur votre moyen de paiement initial</li>
        <li>Articles en promotion ou personnalisés : non éligibles</li>
      </ul>
    </div>

    ${custom_message ? `
    <div style="background:#2a2018;border-radius:16px;border:1px solid rgba(196,154,74,0.3);padding:22px;margin-bottom:20px">
      <div style="font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#c49a4a;margin-bottom:10px">✉️ Un mot de l'équipe</div>
      <div style="color:#f2ede6;font-size:14px;line-height:1.7;white-space:pre-wrap">${escapeHtml(custom_message)}</div>
    </div>` : ""}

    <p style="margin:0 0 28px;color:rgba(242,237,230,0.55);font-size:13px;line-height:1.7;text-align:center">
      Une question sur votre retour ?<br>
      <a href="mailto:contact@milkbebe.fr" style="color:#c49a4a;font-weight:700;text-decoration:underline">contact@milkbebe.fr</a>
    </p>

    <div style="text-align:center;color:rgba(242,237,230,0.2);font-size:12px;line-height:1.8">
      <p style="margin:0">M!LK — Essentiels bébé en bambou premium</p>
      <p style="margin:4px 0 0">
        <a href="${BASE}/fr/cgv" style="color:rgba(242,237,230,0.3)">CGV</a> ·
        <a href="${BASE}/fr/livraison" style="color:rgba(242,237,230,0.3)">Livraison & Retours</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * POST /api/emails/retour
 * Body : { email, prenom?, order_number?, custom_message?, preview? }
 *
 * Auth : x-internal-secret (depuis nos routes server) OU Bearer admin
 * (depuis l'admin UI). Si preview=true, retourne l'HTML brut sans envoi.
 */
export async function POST(req: NextRequest) {
  // Auth : server-to-server (webhook, routes admin) via x-internal-secret ; sinon appel
  // depuis l'admin UI (adminFetch → Bearer JWT) → VRAIE validation admin (getUser + is_admin).
  // ⚠️ Correctif B1 : l'ancien `authHeader.length > 20` acceptait n'importe quelle chaîne
  // de 21+ caractères → phishing possible depuis contact@milkbebe.fr.
  const internalSecret = req.headers.get("x-internal-secret");
  const isInternal     = internalSecret === process.env.INTERNAL_EMAIL_SECRET;
  if (!isInternal) {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;
  }

  const { email, prenom, order_number, custom_message, preview } = await req.json();
  const html = buildHtml({ prenom, order_number, custom_message });

  if (preview) {
    return new Response(html, {
      status:  200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (!email) return Response.json({ error: "email manquant" }, { status: 400 });

  const { error } = await resend.emails.send({
    from:    "M!LK <contact@milkbebe.fr>",
    to:      email,
    subject: order_number
      ? `Instructions de retour — Commande #${String(order_number).slice(0, 8).toUpperCase()}`
      : "Instructions de retour — M!LK",
    html,
  });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
