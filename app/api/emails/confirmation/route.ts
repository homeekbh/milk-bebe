import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE   = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

function emailConfirmation(
  prenom: string,
  email: string,
  items: any[],
  amountTotal: number,
  orderId: string
): string {
  const itemsList = items.map(i => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #2d2419">
        <div style="color:#f2ede6;font-weight:700;font-size:14px">${i.name}</div>
        <div style="color:rgba(242,237,230,0.4);font-size:12px;margin-top:3px">${i.category_slug ?? "M!LK"}</div>
      </td>
      <td style="padding:12px 0;border-bottom:1px solid #2d2419;color:rgba(242,237,230,0.5);text-align:center;font-size:13px">×${i.quantity ?? 1}</td>
      <td style="padding:12px 0;border-bottom:1px solid #2d2419;color:#c49a4a;font-weight:900;text-align:right;font-size:14px">${((i.price ?? 0) * (i.quantity ?? 1)).toFixed(2)} €</td>
    </tr>
  `).join("");

  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0b09;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:600px;margin:0 auto;padding:40px 20px">

  <div style="text-align:center;margin-bottom:40px">
    <div style="display:inline-block;background:#c49a4a;border-radius:12px;padding:14px 28px">
      <span style="color:#1a1410;font-weight:950;font-size:22px;letter-spacing:-1px">M!LK</span>
    </div>
  </div>

  <div style="background:#1a1410;border-radius:20px;border:1px solid rgba(242,237,230,0.08);padding:40px;margin-bottom:20px;text-align:center">
    <div style="font-size:48px;margin-bottom:20px">✅</div>
    <h1 style="margin:0 0 10px;color:#f2ede6;font-size:28px;font-weight:900;letter-spacing:-1px">
      Commande confirmée !
    </h1>
    <p style="margin:0;color:rgba(242,237,230,0.5);font-size:15px;line-height:1.7">
      ${prenom ? `Merci ${prenom} !` : "Merci !"} Ta commande <strong style="color:#c49a4a">#${orderId.slice(0, 8).toUpperCase()}</strong> est bien enregistrée.<br>
      On prépare ton colis avec soin 🌿
    </p>
  </div>

  <div style="background:#1a1410;border-radius:16px;border:1px solid rgba(242,237,230,0.08);padding:28px;margin-bottom:20px">
    <div style="font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:rgba(242,237,230,0.3);margin-bottom:16px">Ta commande</div>
    <table style="width:100%;border-collapse:collapse">
      ${itemsList}
    </table>
    <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(196,154,74,0.2);text-align:right">
      <span style="color:#c49a4a;font-size:22px;font-weight:950">${amountTotal.toFixed(2)} €</span>
      <div style="color:rgba(242,237,230,0.3);font-size:12px;margin-top:4px">TTC, livraison incluse</div>
    </div>
  </div>

  <div style="background:#1a1410;border-radius:16px;border:1px solid rgba(242,237,230,0.08);padding:24px;margin-bottom:20px">
    <div style="font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:rgba(242,237,230,0.3);margin-bottom:16px">Livraison estimée</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div style="text-align:center;padding:16px;background:rgba(242,237,230,0.04);border-radius:12px">
        <div style="font-size:24px;margin-bottom:8px">📦</div>
        <div style="font-size:12px;color:rgba(242,237,230,0.4);margin-bottom:4px">Préparation</div>
        <div style="font-size:14px;color:#f2ede6;font-weight:800">1-2 jours ouvrés</div>
      </div>
      <div style="text-align:center;padding:16px;background:rgba(242,237,230,0.04);border-radius:12px">
        <div style="font-size:24px;margin-bottom:8px">🚚</div>
        <div style="font-size:12px;color:rgba(242,237,230,0.4);margin-bottom:4px">Livraison</div>
        <div style="font-size:14px;color:#f2ede6;font-weight:800">2-4 jours ouvrés</div>
      </div>
    </div>
  </div>

  <div style="text-align:center;margin-bottom:32px">
    <a href="${BASE}/produits" style="display:inline-block;background:#f2ede6;color:#1a1410;padding:16px 40px;border-radius:14px;font-weight:900;font-size:15px;text-decoration:none">
      Continuer mes achats →
    </a>
  </div>

  <div style="background:#1a1410;border-radius:16px;border:1px solid rgba(196,154,74,0.12);padding:24px;margin-bottom:24px;text-align:center">
    <div style="color:#c49a4a;font-size:13px;font-weight:700;line-height:1.8">
      🌿 <strong>Bambou certifié OEKO-TEX</strong> · 3× plus doux que le coton<br>
      🌡️ Thermorégulateur naturel · Antibactérien<br>
      ❤️ Conçu pour la peau la plus fragile
    </div>
  </div>

  <div style="text-align:center;color:rgba(242,237,230,0.2);font-size:11px;line-height:1.8">
    <p style="margin:0">M!LK — Essentiels bébé en bambou premium</p>
    <p style="margin:4px 0 0">contact@milkbebe.fr · <a href="${BASE}/livraison" style="color:rgba(242,237,230,0.2);text-decoration:none">Livraison & retours</a></p>
  </div>

</div>
</body>
</html>`;
}

export async function POST(req: Request) {
  try {
    const { email, prenom, items, amount_total, order_id } = await req.json();

    if (!email) return Response.json({ error: "Email manquant" }, { status: 400 });

    const { data, error } = await resend.emails.send({
      from:    "M!LK <contact@milkbebe.fr>",
      to:      email,
      subject: `✅ Commande confirmée — M!LK #${order_id?.slice(0, 8).toUpperCase()}`,
      html:    emailConfirmation(prenom ?? "", email, items ?? [], amount_total ?? 0, order_id ?? ""),
    });

    if (error) {
      console.error("Email confirmation error:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ ok: true, id: data?.id });
  } catch (e: any) {
    console.error("Email confirmation error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}