import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE   = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

export const dynamic = "force-dynamic";

/**
 * POST /api/emails/parrain-recompense
 * Déclenché par le webhook checkout.session.completed quand une commande payée
 * a utilisé un code parrain valide : informe le PARRAIN qu'une récompense de
 * {montant}€ est disponible sur son compte.
 * Auth interne : header x-internal-secret === INTERNAL_EMAIL_SECRET.
 */
export async function POST(req: Request) {
  const secret = (req as any).headers?.get?.("x-internal-secret");
  if (secret !== process.env.INTERNAL_EMAIL_SECRET) {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const { email, prenom, montant } = await req.json();
    if (!email) return Response.json({ error: "email manquant" }, { status: 400 });

    const montantFmt = Number(montant ?? 5).toFixed(0);
    const salut = prenom ? `${prenom}, une` : "Une";

    const { error } = await resend.emails.send({
      from:    "M!LK <contact@milkbebe.fr>",
      to:      email,
      subject: `🎁 ${montantFmt}€ de récompense parrainage sur ton compte M!LK`,
      html: `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0b09;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:600px;margin:0 auto;padding:40px 20px">

  <div style="text-align:center;margin-bottom:40px">
    <div style="display:inline-block;background:#c49a4a;border-radius:12px;padding:14px 28px">
      <span style="color:#1a1410;font-weight:950;font-size:22px;letter-spacing:-1px">M!LK</span>
    </div>
  </div>

  <div style="background:#1a1410;border-radius:20px;border:1px solid rgba(242,237,230,0.08);padding:40px;margin-bottom:20px;text-align:center">
    <div style="font-size:48px;margin-bottom:20px">🎁</div>
    <h1 style="margin:0 0 16px;color:#f2ede6;font-size:26px;font-weight:900;letter-spacing:-1px;line-height:1.2">
      ${salut} amie a utilisé ton code parrain !
    </h1>
    <p style="margin:0 0 26px;color:rgba(242,237,230,0.6);font-size:15px;line-height:1.8">
      Merci de faire rayonner M!LK. Une récompense de
      <strong style="color:#c49a4a">${montantFmt}€</strong> vient d'être ajoutée à ton compte —
      à utiliser sur ta prochaine commande.
    </p>
    <a href="${BASE}/fr/profil"
       style="display:inline-block;background:#c49a4a;color:#1a1410;font-weight:900;font-size:15px;padding:16px 32px;border-radius:12px;text-decoration:none;letter-spacing:-0.3px">
      Voir mes récompenses →
    </a>
  </div>

  <div style="background:#1a1410;border-radius:16px;border:1px solid rgba(242,237,230,0.08);padding:24px;margin-bottom:20px">
    <p style="color:rgba(242,237,230,0.5);font-size:13px;line-height:1.7;margin:0;text-align:center">
      Tes récompenses sont cumulables et s'utilisent en cases à cocher au panier,
      dès que le montant de ta commande atteint le seuil indiqué. Elles ont une durée
      de validité limitée — pense à en profiter !
    </p>
  </div>

  <div style="text-align:center;padding:20px 0">
    <p style="color:rgba(242,237,230,0.2);font-size:12px;margin:0">
      M!LK — Des essentiels bébé. Sans le superflu.<br>
      <a href="${BASE}/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}" style="color:rgba(242,237,230,0.2)">Se désabonner</a>
    </p>
  </div>

</div>
</body></html>`,
    });

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e?.message ?? "Erreur serveur" }, { status: 500 });
  }
}
