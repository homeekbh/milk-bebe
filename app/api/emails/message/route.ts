import { Resend } from "resend";
import { requireAdmin } from "@/lib/admin-auth";
import { escapeHtml } from "@/lib/escape-html";
import type { NextRequest } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE   = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

// Limites de saisie — dupliquées côté modale admin, ré-appliquées ici (défense
// serveur : la seule qui fasse foi, l'UI n'étant qu'un confort).
const SUBJECT_MAX = 150;
const MESSAGE_MAX = 5000;

function buildHtml(opts: {
  prenom?:       string;
  order_number?: string;
  message?:      string;
}): string {
  const { prenom, order_number, message } = opts;
  const numero = order_number ? `#${escapeHtml(order_number.toString().slice(0, 8).toUpperCase())}` : "";
  const titrePrenom = prenom ? `${escapeHtml(prenom)}, un message de M!LK` : "Un message de M!LK";

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
      <div style="color:#f2ede6;font-size:15px;line-height:1.7;white-space:pre-wrap">${escapeHtml(message)}</div>
    </div>

    <p style="margin:0 0 28px;color:rgba(242,237,230,0.55);font-size:13px;line-height:1.7;text-align:center">
      Une question ?<br>
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
 * POST /api/emails/message
 * Body : { email, prenom?, order_number?, subject, message, preview? }
 *
 * Message LIBRE d'un admin vers une cliente, depuis la fiche commande.
 * subject/message viennent du body (c'est la nouveauté vs les autres routes,
 * dont le sujet est codé en dur ou dérivé). Auth : x-internal-secret OU Bearer
 * admin. Si preview=true, retourne l'HTML brut sans envoi et sans validation.
 *
 * Aucun marqueur en notes, aucune colonne DB : un message libre est légitimement
 * répétable (pas d'idempotence, contrairement à l'annulation).
 */
export async function POST(req: NextRequest) {
  // Auth : server-to-server (webhook, routes admin) via x-internal-secret ; sinon appel
  // depuis l'admin UI (adminFetch → Bearer JWT) → VRAIE validation admin (getUser + is_admin).
  // ⚠️ Correctif B1 : l'ancien `authHeader.length > 20` acceptait n'importe quelle chaîne
  // de 21+ caractères → phishing possible depuis contact@milkbebe.fr.
  const internalSecret = req.headers.get("x-internal-secret");
  // Fail-closed : un secret d'env vide/undefined ne doit JAMAIS valider (sinon "" === "" → bypass).
  const isInternal     = !!process.env.INTERNAL_EMAIL_SECRET && internalSecret === process.env.INTERNAL_EMAIL_SECRET;
  if (!isInternal) {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;
  }

  const { email, prenom, order_number, subject, message, preview } = await req.json();

  // Anti-injection d'en-tête : un Subject ne doit JAMAIS contenir de CR/LF (sinon
  // injection d'en-têtes SMTP). On neutralise les sauts de ligne AVANT trim + plafond.
  const cleanSubject = typeof subject === "string" ? subject.replace(/[\r\n]/g, " ").trim() : "";
  const cleanMessage = typeof message === "string" ? message.trim() : "";

  const html = buildHtml({ prenom, order_number, message: cleanMessage });

  if (preview) {
    return new Response(html, {
      status:  200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (!email)                            return Response.json({ error: "email manquant" }, { status: 400 });
  if (!cleanSubject)                     return Response.json({ error: "Objet manquant : l'objet de l'email est obligatoire." }, { status: 400 });
  if (!cleanMessage)                     return Response.json({ error: "Message manquant : le corps de l'email est obligatoire." }, { status: 400 });
  if (cleanSubject.length > SUBJECT_MAX) return Response.json({ error: `Objet trop long (max ${SUBJECT_MAX} caractères).` }, { status: 400 });
  if (cleanMessage.length > MESSAGE_MAX) return Response.json({ error: `Message trop long (max ${MESSAGE_MAX} caractères).` }, { status: 400 });

  const { error } = await resend.emails.send({
    from:    "M!LK <contact@milkbebe.fr>",
    to:      email,
    replyTo: "contact@milkbebe.fr",
    subject: cleanSubject,   // ← le sujet vient du body, c'est la nouveauté
    html,
  });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
