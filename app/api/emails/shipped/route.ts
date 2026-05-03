import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE   = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

export async function POST(req: Request) {
  const { email, prenom, tracking, items } = await req.json();
  if (!email) return Response.json({ error: "email manquant" }, { status: 400 });

  const itemsList = (Array.isArray(items) ? items : []).map((i: any) =>
    `<tr>
      <td style="padding:10px 0;border-bottom:1px solid #3d2e1e;color:#f2ede6;font-weight:700">${i.name}</td>
      <td style="padding:10px 0;border-bottom:1px solid #3d2e1e;color:#c49a4a;font-weight:900;text-align:right">×${i.quantity}</td>
    </tr>`
  ).join("");

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#1a1410;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px">
    <div style="text-align:center;margin-bottom:40px">
      <div style="display:inline-block;background:#c49a4a;border-radius:12px;padding:14px 28px">
        <span style="color:#1a1410;font-weight:950;font-size:24px;letter-spacing:-1px">M!LK</span>
      </div>
    </div>
    <div style="background:#2a2018;border-radius:20px;border:1px solid rgba(242,237,230,0.08);padding:36px;margin-bottom:24px;text-align:center">
      <div style="font-size:48px;margin-bottom:16px">🚚</div>
      <h1 style="margin:0 0 12px;color:#f2ede6;font-size:26px;font-weight:950;letter-spacing:-1px">
        ${prenom ? `${prenom}, votre` : "Votre"} commande est en route !
      </h1>
      <p style="margin:0;color:rgba(242,237,230,0.55);font-size:15px;line-height:1.7">
        Votre colis M!LK a été expédié. Bébé va bientôt recevoir ses essentiels en bambou 🌿
      </p>
    </div>
    ${tracking ? `
    <div style="background:#2a2018;border-radius:16px;border:1px solid rgba(242,237,230,0.08);padding:24px;margin-bottom:24px;text-align:center">
      <div style="font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:rgba(242,237,230,0.35);margin-bottom:8px">Numéro de suivi</div>
      <div style="font-size:22px;font-weight:950;color:#c49a4a;font-family:monospace;letter-spacing:1px">${tracking}</div>
    </div>` : ""}
    <div style="background:#2a2018;border-radius:16px;border:1px solid rgba(242,237,230,0.08);padding:24px;margin-bottom:24px">
      <div style="font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:rgba(242,237,230,0.35);margin-bottom:16px">Votre commande</div>
      <table style="width:100%;border-collapse:collapse">${itemsList}</table>
    </div>
    <div style="text-align:center;margin-bottom:32px">
      <a href="${BASE}/produits" style="display:inline-block;background:#f2ede6;color:#1a1410;padding:16px 36px;border-radius:14px;font-weight:900;font-size:16px;text-decoration:none">
        Découvrir la collection →
      </a>
    </div>
    <div style="text-align:center;color:rgba(242,237,230,0.2);font-size:12px;line-height:1.8">
      <p style="margin:0">M!LK — Essentiels bébé en bambou premium</p>
      <p style="margin:4px 0 0">Des questions ? <a href="mailto:contact@milkbebe.fr" style="color:rgba(242,237,230,0.4)">contact@milkbebe.fr</a></p>
    </div>
  </div>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from:    "M!LK <contact@milkbebe.fr>",
    to:      email,
    subject: `🚚 Votre commande M!LK est en route !`,
    html,
  });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}