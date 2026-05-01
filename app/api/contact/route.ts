import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN  = process.env.ADMIN_EMAIL_1 ?? "contact@milkbebe.fr";

// Sanitise le HTML pour éviter l'injection dans l'email admin
function sanitize(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export async function POST(req: Request) {
  const { nom, email, sujet, message } = await req.json();
  if (!nom || !email || !message) return Response.json({ error: "Champs manquants" }, { status: 400 });

  // Validation email basique
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Email invalide" }, { status: 400 });
  }

  const sNom     = sanitize(nom);
  const sEmail   = sanitize(email);
  const sSujet   = sanitize(sujet ?? "");
  const sMessage = sanitize(message).replace(/\n/g, "<br>");

  await resend.emails.send({
    from:    "M!LK Contact <onboarding@resend.dev>",
    to:      ADMIN,
    replyTo: email, // email original (pas sanitisé) pour le reply-to
    subject: `📩 Message de ${sNom} — ${sSujet || "Contact M!LK"}`,
    html: `
<div style="font-family:sans-serif;max-width:500px;padding:24px;background:#1a1410;color:#f2ede6;border-radius:16px">
  <h2 style="color:#c49a4a;margin:0 0 20px">Nouveau message de contact</h2>
  <p><strong>Nom :</strong> ${sNom}</p>
  <p><strong>Email :</strong> <a href="mailto:${sEmail}" style="color:#c49a4a">${sEmail}</a></p>
  ${sSujet ? `<p><strong>Sujet :</strong> ${sSujet}</p>` : ""}
  <div style="margin-top:16px;padding:16px;background:#2a2018;border-radius:12px;line-height:1.7">${sMessage}</div>
  <p style="margin-top:16px;font-size:12px;opacity:0.4">Réponds directement à cet email pour répondre au client.</p>
</div>`,
  });

  await resend.emails.send({
    from:    "M!LK <onboarding@resend.dev>",
    to:      email,
    subject: "Nous avons bien reçu votre message — M!LK",
    html: `
<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:40px 20px;background:#1a1410;text-align:center">
  <div style="background:#c49a4a;border-radius:12px;padding:12px 24px;display:inline-block;margin-bottom:28px">
    <span style="color:#1a1410;font-weight:950;font-size:20px">M!LK</span>
  </div>
  <h2 style="color:#f2ede6;margin:0 0 14px">Message bien reçu !</h2>
  <p style="color:rgba(242,237,230,0.5);font-size:15px;line-height:1.7;margin:0 0 24px">
    Merci ${sNom}, on revient vers toi sous 24h en jours ouvrés.
  </p>
  <a href="${process.env.NEXT_PUBLIC_BASE_URL ?? "https://milk-bebe.vercel.app"}/produits"
    style="display:inline-block;background:#f2ede6;color:#1a1410;padding:13px 28px;border-radius:12px;font-weight:900;font-size:14px;text-decoration:none">
    Voir la collection →
  </a>
</div>`,
  });

  return Response.json({ ok: true });
}