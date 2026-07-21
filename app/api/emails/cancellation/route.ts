import { Resend } from "resend";
import { requireAdmin } from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE   = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtml(opts: { prenom?: string; order_number?: string; custom_message?: string }): string {
  const { prenom, order_number, custom_message } = opts;
  const numero = order_number ? `#${escapeHtml(order_number.toString().slice(0, 8).toUpperCase())}` : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#1a1410;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px">
    <div style="text-align:center;margin-bottom:40px">
      <div style="display:inline-block;background:#c49a4a;border-radius:12px;padding:14px 28px">
        <span style="color:#1a1410;font-weight:950;font-size:24px;letter-spacing:-1px">M!LK</span>
      </div>
    </div>
    <div style="background:#2a2018;border-radius:20px;border:1px solid rgba(242,237,230,0.08);padding:36px;margin-bottom:24px">
      <h1 style="margin:0 0 16px;color:#f2ede6;font-size:24px;font-weight:950;letter-spacing:-1px">
        ${prenom ? `${escapeHtml(prenom)}, mise à jour` : "Mise à jour"} de votre commande
      </h1>
      <p style="margin:0 0 18px;color:rgba(242,237,230,0.7);font-size:15px;line-height:1.7">
        Votre commande M!LK ${numero} a été annulée.
      </p>
      <p style="margin:0 0 18px;color:rgba(242,237,230,0.55);font-size:14px;line-height:1.7">
        Si vous avez été débité, le remboursement sera effectué sous <strong style="color:#f2ede6">3 à 5 jours ouvrés</strong> sur votre moyen de paiement initial.
      </p>
      <p style="margin:0;color:rgba(242,237,230,0.55);font-size:14px;line-height:1.7">
        Pour toute question : <a href="mailto:contact@milkbebe.fr" style="color:#c49a4a;font-weight:700;text-decoration:underline">contact@milkbebe.fr</a>
      </p>
    </div>
    ${custom_message ? `
    <div style="background:#2a2018;border-radius:16px;border:1px solid rgba(196,154,74,0.2);padding:24px;margin-bottom:24px">
      <div style="font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#c49a4a;margin-bottom:10px">✉️ Un mot de l'équipe</div>
      <div style="color:#f2ede6;font-size:15px;line-height:1.7;white-space:pre-wrap">${escapeHtml(custom_message)}</div>
    </div>` : ""}
    <div style="text-align:center;margin-bottom:32px">
      <a href="${BASE}/fr/produits" style="display:inline-block;background:#f2ede6;color:#1a1410;padding:14px 32px;border-radius:12px;font-weight:900;font-size:15px;text-decoration:none">
        Voir la collection M!LK →
      </a>
    </div>
    <div style="text-align:center;color:rgba(242,237,230,0.2);font-size:12px;line-height:1.8">
      <p style="margin:0">M!LK — Essentiels bébé en bambou premium</p>
      <p style="margin:4px 0 0">contact@milkbebe.fr</p>
    </div>
  </div>
</body>
</html>`;
}

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
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (!email) return Response.json({ error: "email manquant" }, { status: 400 });

  const { error } = await resend.emails.send({
    from:    "M!LK <contact@milkbebe.fr>",
    to:      email,
    subject: "Votre commande M!LK — Mise à jour importante",
    html,
  });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
