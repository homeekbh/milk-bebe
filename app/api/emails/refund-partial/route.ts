import { Resend } from "resend";

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

const money = (n: any) => `${(Number(n ?? 0)).toFixed(2)} €`;

function buildHtml(opts: { prenom?: string; order_number?: string; refund_amount?: number; order_total?: number }): string {
  const { prenom, order_number, refund_amount, order_total } = opts;
  const numero = order_number ? `#${escapeHtml(order_number.toString().slice(0, 8).toUpperCase())}` : "";
  // Le solde restant n'est affiché que si on connaît le total (sinon on reste évasif
  // plutôt que de bricoler un chiffre faux).
  const remaining = (typeof order_total === "number" && order_total > 0)
    ? Math.max(0, order_total - Number(refund_amount ?? 0))
    : null;

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
        ${prenom ? `${escapeHtml(prenom)}, un` : "Un"} remboursement partiel est en route
      </h1>
      <p style="margin:0 0 18px;color:rgba(242,237,230,0.7);font-size:15px;line-height:1.7">
        Sur votre commande M!LK ${numero}, nous venons de vous rembourser :
      </p>
      <div style="text-align:center;margin:22px 0">
        <span style="display:inline-block;background:#c49a4a;color:#1a1410;font-weight:950;font-size:28px;padding:14px 28px;border-radius:14px">
          ${escapeHtml(money(refund_amount))}
        </span>
      </div>
      <p style="margin:0 0 18px;color:rgba(242,237,230,0.7);font-size:15px;line-height:1.7">
        Le reste de votre commande <strong style="color:#f2ede6">reste valide</strong> et suit son cours normalement${remaining !== null ? ` — il vous reste <strong style="color:#f2ede6">${escapeHtml(money(remaining))}</strong> réglés pour les articles conservés` : ""}.
      </p>
      <p style="margin:0 0 18px;color:rgba(242,237,230,0.55);font-size:14px;line-height:1.7">
        Le remboursement apparaîtra sur votre moyen de paiement initial sous <strong style="color:#f2ede6">3 à 5 jours ouvrés</strong>.
      </p>
      <p style="margin:0;color:rgba(242,237,230,0.55);font-size:14px;line-height:1.7">
        Une question ? Écrivez-nous : <a href="mailto:contact@milkbebe.fr" style="color:#c49a4a;font-weight:700;text-decoration:underline">contact@milkbebe.fr</a>
      </p>
    </div>
    <div style="text-align:center;color:rgba(242,237,230,0.2);font-size:12px;line-height:1.8">
      <p style="margin:0">M!LK — Essentiels bébé en bambou premium</p>
      <p style="margin:4px 0 0">contact@milkbebe.fr</p>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(req: Request) {
  const internalSecret = (req as any).headers?.get?.("x-internal-secret");
  const authHeader     = (req as any).headers?.get?.("authorization") ?? "";
  const isInternal     = internalSecret === process.env.INTERNAL_EMAIL_SECRET;
  const isAdmin        = authHeader.startsWith("Bearer ") && authHeader.length > 20;
  if (!isInternal && !isAdmin) {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { email, prenom, order_number, refund_amount, order_total, preview } = await req.json();
  const html = buildHtml({ prenom, order_number, refund_amount, order_total });

  if (preview) {
    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (!email) return Response.json({ error: "email manquant" }, { status: 400 });

  const numero = order_number ? `#${String(order_number).slice(0, 8).toUpperCase()}` : "";
  const { error } = await resend.emails.send({
    from:    "M!LK <contact@milkbebe.fr>",
    to:      email,
    subject: `Remboursement partiel — commande ${numero}`.trim(),
    html,
  });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
