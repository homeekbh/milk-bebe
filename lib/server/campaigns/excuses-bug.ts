// Campagne « Toutes nos excuses, et une bonne nouvelle ».
// Module PUR (aucune dépendance Next/Supabase) → réutilisable par la route ET
// testable en isolation. Charte reprise À L'IDENTIQUE des mails M!LK existants :
// fond de page #0d0b09, cartes #1a1410, texte #f2ede6, accent #c49a4a, logo M!LK
// en bloc ambre arrondi, largeur max 600px, CTA ambre.

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

export const SUBJECT = "Toutes nos excuses, et une bonne nouvelle";
export const FROM    = "M!LK <contact@milkbebe.fr>";

export type Recipient = { email: string; prenom: string | null; hasAccount: boolean; token: string | null; isNewsletter: boolean };

// Pied RGPD — repris À L'IDENTIQUE de campaigns/nouveautes-parrainage :
// abonné newsletter → lien de désabonnement tokenisé ; compte hors newsletter →
// mention « titulaire d'un compte » + lien contact.
export function footerHtml(r: Pick<Recipient, "isNewsletter" | "token">): string {
  const brand = `M!LK — Des essentiels bébé. Sans le superflu.`;
  if (r.isNewsletter) {
    const unsub = r.token
      ? `${BASE}/api/newsletter/unsubscribe?token=${r.token}`
      : `${BASE}/fr/contact`;
    return `${brand}<br><a href="${unsub}" style="color:rgba(242,237,230,0.3)">Se désabonner</a>`;
  }
  return `${brand}<br><span style="color:rgba(242,237,230,0.3)">Tu reçois cet email en tant que titulaire d'un compte M!LK. Une question ? <a href="${BASE}/fr/contact" style="color:rgba(242,237,230,0.3)">Écris-nous</a>.</span>`;
}

// Équivalent texte brut du pied (même logique de source).
export function footerText(r: Pick<Recipient, "isNewsletter" | "token">): string {
  const brand = `M!LK — Des essentiels bébé. Sans le superflu.`;
  if (r.isNewsletter) {
    const unsub = r.token
      ? `${BASE}/api/newsletter/unsubscribe?token=${r.token}`
      : `${BASE}/fr/contact`;
    return `${brand}\nSe désabonner : ${unsub}`;
  }
  return `${brand}\nTu reçois cet email en tant que titulaire d'un compte M!LK. Une question ? Écris-nous : ${BASE}/fr/contact`;
}

// HTML — texte d'Erika repris MOT POUR MOT. `footer` est injecté (par destinataire).
export function excusesBugHtml(footer: string): string {
  const P    = `margin:0 0 16px;color:rgba(242,237,230,0.78);font-size:15px;line-height:1.75`;
  const CARD = `background:#1a1410;border-radius:18px;border:1px solid rgba(242,237,230,0.08);padding:34px 30px;margin-bottom:18px`;
  const LI   = `margin:0 0 12px;color:rgba(242,237,230,0.82);font-size:14.5px;line-height:1.6`;
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0b09;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:600px;margin:0 auto;padding:40px 20px">

  <div style="text-align:center;margin-bottom:32px">
    <div style="display:inline-block;background:#c49a4a;border-radius:12px;padding:14px 28px">
      <span style="color:#1a1410;font-weight:950;font-size:22px;letter-spacing:-1px">M!LK</span>
    </div>
  </div>

  <div style="${CARD}">
    <p style="${P}">Bonjour,</p>
    <p style="${P}">Je m'appelle Erika. M!LK, c'est ma marque — et je la lance seule. Le site, c'est mon compagnon qui l'a construit, de A à Z, lui aussi tout seul.</p>
    <p style="${P}">Autant vous dire qu'on apprend en marchant.</p>
    <p style="${P}">On nous a signalé ces derniers jours qu'il pouvait être impossible de finaliser une commande. Un petit bug, mais qui bloquait le paiement. J'espère de tout cœur que vous n'avez pas été nombreuses dans ce cas — et si ça vous est arrivé, je suis vraiment désolée.</p>
    <p style="${P}">On a passé la nuit dessus. C'est corrigé.</p>
    <p style="${P}">Et voilà la bonne nouvelle : vous pouvez commander. Le paiement fonctionne, avec tous les moyens possibles — carte Visa et Mastercard, PayPal, Apple Pay, Google Pay, et même Klarna pour payer en plusieurs fois.</p>
    <p style="${P}">Si vous aviez laissé un panier en attente, il vous attend toujours. Et le code <strong style="color:#c49a4a">ETE30</strong> est encore valable : <strong style="color:#c49a4a">-30%</strong> sur toute la collection.</p>

    <p style="margin:22px 0 12px;color:#f2ede6;font-size:15px;font-weight:800">Trois choses utiles, tant que j'y suis :</p>
    <div style="background:#211913;border-radius:14px;border:1px solid rgba(196,154,74,0.22);padding:20px 22px;margin:0 0 20px">
      <p style="${LI}">• La livraison est offerte en France dès 60 € d'achat</p>
      <p style="${LI}">• En créant votre compte, vous recevez un code de parrainage à partager — vous et la personne que vous parrainez y gagnez toutes les deux</p>
      <p style="margin:0;color:rgba(242,237,230,0.82);font-size:14.5px;line-height:1.6">• Et si quelque chose cloche, écrivez-moi directement : <a href="mailto:contact@milkbebe.fr" style="color:#c49a4a;text-decoration:none;font-weight:700">contact@milkbebe.fr</a></p>
    </div>

    <p style="${P}">Merci. Vraiment. Quand on démarre à deux, chaque commande, chaque message, chaque encouragement compte bien plus que vous ne l'imaginez. Continuez à nous suivre, à nous écrire, à nous soutenir — c'est ce qui nous fait avancer.</p>
    <p style="${P}">Pendant ce temps, je prépare de nouveaux modèles pour les prochaines collections. Si tout se passe bien, vous les découvrirez d'ici septembre.</p>
    <p style="margin:0 0 4px;color:rgba(242,237,230,0.78);font-size:15px;line-height:1.75">À très vite,</p>
    <p style="margin:0;color:#c49a4a;font-size:16px;font-weight:900">Erika</p>
    <p style="margin:2px 0 0;color:rgba(242,237,230,0.4);font-size:13px;font-style:italic">Fondatrice de M!LK</p>
  </div>

  <div style="text-align:center;margin-bottom:22px">
    <a href="${BASE}/fr/produits" style="display:inline-block;background:#c49a4a;color:#1a1410;font-weight:900;font-size:15px;padding:16px 34px;border-radius:12px;text-decoration:none;letter-spacing:-0.3px">Voir la collection →</a>
  </div>

  <div style="text-align:center;padding:8px 0">
    <p style="color:rgba(242,237,230,0.3);font-size:12px;line-height:1.8;margin:0">${footer}</p>
  </div>

</div>
</body></html>`;
}

// Version TEXTE BRUT — même texte, améliore la délivrabilité.
export function excusesBugText(footer: string): string {
  return [
    "Bonjour,",
    "",
    "Je m'appelle Erika. M!LK, c'est ma marque — et je la lance seule. Le site, c'est mon compagnon qui l'a construit, de A à Z, lui aussi tout seul.",
    "",
    "Autant vous dire qu'on apprend en marchant.",
    "",
    "On nous a signalé ces derniers jours qu'il pouvait être impossible de finaliser une commande. Un petit bug, mais qui bloquait le paiement. J'espère de tout cœur que vous n'avez pas été nombreuses dans ce cas — et si ça vous est arrivé, je suis vraiment désolée.",
    "",
    "On a passé la nuit dessus. C'est corrigé.",
    "",
    "Et voilà la bonne nouvelle : vous pouvez commander. Le paiement fonctionne, avec tous les moyens possibles — carte Visa et Mastercard, PayPal, Apple Pay, Google Pay, et même Klarna pour payer en plusieurs fois.",
    "",
    "Si vous aviez laissé un panier en attente, il vous attend toujours. Et le code ETE30 est encore valable : -30% sur toute la collection.",
    "",
    "Trois choses utiles, tant que j'y suis :",
    "- La livraison est offerte en France dès 60 € d'achat",
    "- En créant votre compte, vous recevez un code de parrainage à partager — vous et la personne que vous parrainez y gagnez toutes les deux",
    "- Et si quelque chose cloche, écrivez-moi directement : contact@milkbebe.fr",
    "",
    "Merci. Vraiment. Quand on démarre à deux, chaque commande, chaque message, chaque encouragement compte bien plus que vous ne l'imaginez. Continuez à nous suivre, à nous écrire, à nous soutenir — c'est ce qui nous fait avancer.",
    "",
    "Pendant ce temps, je prépare de nouveaux modèles pour les prochaines collections. Si tout se passe bien, vous les découvrirez d'ici septembre.",
    "",
    "À très vite,",
    "",
    "Erika",
    "Fondatrice de M!LK",
    "",
    `Voir la collection : ${BASE}/fr/produits`,
    "",
    footer,
  ].join("\n");
}
