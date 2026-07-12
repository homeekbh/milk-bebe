import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { Resend } from "resend";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseServer } from "@/lib/server/supabase";

/**
 * Campagne « Nouveautés + Parrainage » — route DORMANTE.
 * N'envoie RIEN tant qu'un admin ne la déclenche pas explicitement.
 *
 *   GET                       → aperçu : comptages destinataires + préconditions
 *                               (ETE30 actif ? parrainage actif ?) + HTML d'exemple
 *                               des 2 variantes. Aucun envoi.
 *   POST { mode:"test", test_email } → envoie les 2 variantes à UNE adresse (revue).
 *   POST { mode:"send", confirm:true } → envoi de masse (fusion comptes + abonnés,
 *                               dédup par email). Bloqué si ETE30 inactif/expiré ou
 *                               parrainage désactivé (on n'annonce pas une promo morte
 *                               ni une feature coupée).
 *
 * Destinataires = profiles (comptes) ∪ newsletter_subscribers(active) dédupliqués.
 * resend.batch.send() → 1 email distinct par personne. Désabonnement tokenisé pour
 * les abonnés newsletter ; pied « compte » pour les comptes hors liste newsletter.
 */

const BASE    = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";
const FROM    = "M!LK <contact@milkbebe.fr>";
const SUBJECT = "On a du nouveau chez M!LK 🌿 (et une bonne surprise)";
const ADMIN_EMAILS = [process.env.ADMIN_EMAIL_1, "muchismo.art@gmail.com"].filter(Boolean) as string[];

type Recipient = { email: string; prenom: string | null; hasAccount: boolean; token: string | null; isNewsletter: boolean };

// ── Préconditions (rappels du prompt : ne jamais annoncer un code mort / feature off)
async function checkPreconditions() {
  const now = Date.now();
  const { data: ete } = await supabaseServer
    .from("promo_codes").select("active, expires_at").eq("code", "ETE30").maybeSingle();
  const ete30Active = !!ete && ete.active && (!ete.expires_at || new Date(ete.expires_at).getTime() > now);

  const { data: ps } = await supabaseServer
    .from("parrainage_settings").select("actif").eq("id", 1).maybeSingle();
  const parrainageActif = !!ps && ps.actif;

  return { ete30Active, parrainageActif };
}

// ── Fusion + dédup des destinataires ────────────────────────────────────────
async function buildRecipients(): Promise<Recipient[]> {
  const { data: accounts } = await supabaseServer.from("profiles").select("email, prenom");
  const { data: subs } = await supabaseServer
    .from("newsletter_subscribers").select("email, unsubscribe_token").eq("active", true);

  const map = new Map<string, Recipient>();
  for (const a of accounts ?? []) {
    if (!a.email) continue;
    map.set(String(a.email).toLowerCase().trim(), {
      email: a.email, prenom: a.prenom ?? null, hasAccount: true, token: null, isNewsletter: false,
    });
  }
  for (const s of subs ?? []) {
    if (!s.email) continue;
    const key = String(s.email).toLowerCase().trim();
    const ex = map.get(key);
    if (ex) { ex.isNewsletter = true; ex.token = s.unsubscribe_token ?? null; }
    else map.set(key, { email: s.email, prenom: null, hasAccount: false, token: s.unsubscribe_token ?? null, isNewsletter: true });
  }
  return [...map.values()];
}

// ── Pied de page selon la source (RGPD) ─────────────────────────────────────
function footerHtml(r: Pick<Recipient, "isNewsletter" | "token" | "email">): string {
  const brand = `M!LK — Des essentiels bébé. Sans le superflu.`;
  if (r.isNewsletter) {
    const unsub = r.token
      ? `${BASE}/api/newsletter/unsubscribe?token=${r.token}`
      : `${BASE}/api/newsletter/unsubscribe?email=${encodeURIComponent(r.email)}`;
    return `${brand}<br><a href="${unsub}" style="color:rgba(242,237,230,0.3)">Se désabonner</a>`;
  }
  return `${brand}<br><span style="color:rgba(242,237,230,0.3)">Tu reçois cet email en tant que titulaire d'un compte M!LK. Une question ? <a href="${BASE}/fr/contact" style="color:rgba(242,237,230,0.3)">Écris-nous</a>.</span>`;
}

// ── HTML de l'email (2 variantes via hasAccount) ────────────────────────────
function campaignHtml(opts: { prenom: string | null; hasAccount: boolean; footer: string }): string {
  const { prenom, hasAccount, footer } = opts;
  const bonjour = prenom ? `Bonjour ${prenom},` : "Bonjour,";

  const cta = hasAccount
    ? { href: `${BASE}/fr/profil`,      label: "Voir mon code parrain →" }
    : { href: `${BASE}/fr/inscription`, label: "Créer mon compte et découvrir mon code →" };

  const steps = hasAccount
    ? `
      <p style="margin:0 0 10px"><strong style="color:#c49a4a">1.</strong> <strong>Connecte-toi</strong> sur milkbebe.fr.</p>
      <p style="margin:0 0 10px"><strong style="color:#c49a4a">2.</strong> <strong>Découvre ton code parrain personnel</strong>, dans l'espace « Parrainage » de ton profil.</p>
      <p style="margin:0"><strong style="color:#c49a4a">3.</strong> <strong>Partage-le</strong> à toutes tes amies, ta famille — autant de fois que tu veux.</p>`
    : `
      <p style="margin:0 0 10px"><strong style="color:#c49a4a">1.</strong> <strong>Crée ton compte</strong> sur milkbebe.fr, et complète ton profil.</p>
      <p style="margin:0 0 10px"><strong style="color:#c49a4a">2.</strong> <strong>Découvre ton code parrain personnel</strong>, dans l'espace « Parrainage » de ton profil.</p>
      <p style="margin:0"><strong style="color:#c49a4a">3.</strong> <strong>Partage-le</strong> à toutes tes amies, ta famille — autant de fois que tu veux.</p>`;

  const P = `margin:0 0 16px;color:rgba(242,237,230,0.7);font-size:15px;line-height:1.75`;
  const H2 = `margin:0 0 16px;color:#f2ede6;font-size:20px;font-weight:900;letter-spacing:-0.5px`;
  const CARD = `background:#1a1410;border-radius:18px;border:1px solid rgba(242,237,230,0.08);padding:32px 28px;margin-bottom:18px`;
  const LI = `margin:0 0 10px;color:rgba(242,237,230,0.72);font-size:14.5px;line-height:1.6`;

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
    <p style="margin:0 0 16px;color:#f2ede6;font-size:17px;font-weight:800">${bonjour}</p>
    <p style="${P}">Chez M!LK, on aime faire les choses bien — et ça veut aussi dire prendre le temps de peaufiner ton expérience d'achat.</p>
    <p style="${P}">Ces dernières semaines, on a apporté plusieurs améliorations à notre parcours de commande, pour te rendre les choses encore plus simples et fluides, du premier clic jusqu'à la confirmation.</p>
    <p style="margin:0;color:rgba(242,237,230,0.7);font-size:15px;line-height:1.75"><strong style="color:#f2ede6">On voulait que tu le saches</strong>, parce qu'on tient à ce que commander chez nous soit un vrai plaisir — surtout quand on prépare l'arrivée de bébé.</p>
  </div>

  <div style="${CARD}">
    <h2 style="${H2}">💳 Paie comme tu veux</h2>
    <p style="${P}">Bonne nouvelle : tu as maintenant le choix entre plusieurs façons de régler ta commande.</p>
    <ul style="margin:0;padding-left:20px">
      <li style="${LI}"><strong style="color:#f2ede6">Carte bancaire</strong> (Visa, Mastercard)</li>
      <li style="${LI}"><strong style="color:#f2ede6">PayPal</strong>, si tu as un compte</li>
      <li style="${LI}"><strong style="color:#f2ede6">Apple Pay</strong> et <strong style="color:#f2ede6">Google Pay</strong>, pour un paiement en un geste</li>
      <li style="${LI}"><strong style="color:#f2ede6">Klarna</strong>, notre petite nouveauté — selon ton profil, paie en <strong style="color:#c49a4a">3x ou 4x sans frais</strong>, ou <strong style="color:#c49a4a">achète maintenant, paie plus tard</strong>.</li>
    </ul>
  </div>

  <div style="${CARD}">
    <h2 style="${H2}">🎁 On a lancé le parrainage M!LK</h2>
    <p style="${P}">Toi qui nous fais déjà confiance, autant que tes amies en profitent aussi. En 3 étapes :</p>
    <div style="background:#211913;border-radius:14px;border:1px solid rgba(196,154,74,0.18);padding:20px 22px;margin-bottom:22px;color:rgba(242,237,230,0.72);font-size:14.5px;line-height:1.5">
      ${steps}
    </div>
    <div style="text-align:center;margin-bottom:24px">
      <a href="${cta.href}" style="display:inline-block;background:#c49a4a;color:#1a1410;font-weight:900;font-size:15px;padding:15px 30px;border-radius:12px;text-decoration:none;letter-spacing:-0.3px">${cta.label}</a>
    </div>
    <p style="margin:0 0 6px;color:#f2ede6;font-size:15px;font-weight:900">Dès qu'une amie commande avec ton code, tu gagnes 5€.</p>
    <p style="${P}">Pas de limite au nombre d'amies.</p>

    <div style="height:1px;background:rgba(242,237,230,0.1);margin:8px 0 18px"></div>
    <p style="margin:0 0 10px;color:#f2ede6;font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:1px">Comment ça marche exactement</p>
    <p style="margin:0 0 6px;color:#c49a4a;font-size:14px;font-weight:800">Pour ton amie (la filleule) :</p>
    <ul style="margin:0 0 16px;padding-left:20px">
      <li style="${LI}"><strong style="color:#f2ede6">−5€</strong> sur sa commande dès <strong style="color:#f2ede6">60€ d'achat</strong>.</li>
      <li style="${LI}">Un seul code parrain par commande.</li>
      <li style="${LI}">Aucun compte nécessaire — elle le renseigne au moment du paiement.</li>
    </ul>
    <p style="margin:0 0 6px;color:#c49a4a;font-size:14px;font-weight:800">Pour toi (le parrain) :</p>
    <ul style="margin:0;padding-left:20px">
      <li style="${LI}">Il faut un compte M!LK pour obtenir ton code — il ne change jamais.</li>
      <li style="${LI}"><strong style="color:#f2ede6">5€ par amie</strong> qui commande avec ton code, sans limite.</li>
      <li style="${LI}">Chaque récompense de 5€ est valable <strong style="color:#f2ede6">30 jours</strong>.</li>
      <li style="${LI}">Jusqu'à <strong style="color:#f2ede6">4 récompenses par commande</strong>, débloquées progressivement selon ton panier (dès 60€ pour la 1ʳᵉ, 80€ pour la 2ᵉ, 90€ pour la 3ᵉ, 100€ pour la 4ᵉ).</li>
      <li style="${LI}">Tu ne peux pas utiliser ton propre code sur ta propre commande.</li>
    </ul>
    <p style="margin:16px 0 0;color:rgba(242,237,230,0.45);font-size:13px;line-height:1.6">Toutes ces conditions restent consultables dans ton profil, section Parrainage.</p>
  </div>

  <div style="${CARD}">
    <h2 style="${H2}">🌞 Et ce n'est pas fini</h2>
    <div style="background:#211913;border-radius:16px;border:1.5px solid #c49a4a;padding:24px;text-align:center;margin-bottom:20px">
      <div style="font-size:12px;color:#e8dcc4;text-transform:uppercase;letter-spacing:2px;font-weight:700;margin-bottom:12px">−30% avec le code</div>
      <div style="display:inline-block;padding:12px 24px;background:rgba(196,154,74,0.10);border:1px dashed #c49a4a;border-radius:12px">
        <span style="font-size:26px;font-weight:900;color:#c49a4a;font-family:'Courier New',Courier,monospace;letter-spacing:4px">ETE30</span>
      </div>
      <div style="font-size:12.5px;color:rgba(242,237,230,0.5);margin-top:12px">Toujours actif — et il se cumule avec ton code parrain.</div>
    </div>
    <p style="${P}"><strong style="color:#f2ede6">La livraison est offerte dès 60€ d'achat</strong>, comme toujours.</p>
    <div style="text-align:center;margin-top:8px">
      <a href="${BASE}/fr/produits" style="display:inline-block;background:transparent;color:#f2ede6;font-weight:800;font-size:14px;padding:13px 28px;border-radius:12px;text-decoration:none;border:1px solid rgba(242,237,230,0.25)">Découvrir la collection →</a>
    </div>
  </div>

  <div style="padding:8px 28px 0">
    <p style="margin:0 0 4px;color:rgba(242,237,230,0.7);font-size:15px;line-height:1.7">Merci d'être là depuis le début.</p>
    <p style="margin:0;color:#c49a4a;font-size:16px;font-weight:900">Erika</p>
    <p style="margin:2px 0 0;color:rgba(242,237,230,0.4);font-size:13px;font-style:italic">Fondatrice de M!LK</p>
  </div>

  <div style="text-align:center;padding:28px 0 8px">
    <p style="color:rgba(242,237,230,0.3);font-size:12px;line-height:1.8;margin:0">${footer}</p>
  </div>

</div>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// GET — aperçu (aucun envoi)
// ═══════════════════════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const [pre, recipients] = await Promise.all([checkPreconditions(), buildRecipients()]);
  const avecCompte    = recipients.filter(r => r.hasAccount).length;
  const newsletterSeul = recipients.filter(r => !r.hasAccount).length;

  return NextResponse.json({
    subject: SUBJECT,
    preconditions: pre,
    ready_to_send: pre.ete30Active && pre.parrainageActif,
    counts: { total: recipients.length, avec_compte: avecCompte, newsletter_seul: newsletterSeul },
    sample_html: {
      avec_compte: campaignHtml({ prenom: "Marie", hasAccount: true,  footer: footerHtml({ isNewsletter: false, token: null, email: "marie@exemple.fr" }) }),
      sans_compte: campaignHtml({ prenom: null,     hasAccount: false, footer: footerHtml({ isNewsletter: true,  token: "APERCU-TOKEN", email: "abo@exemple.fr" }) }),
    },
    note: "Aucun envoi. POST {mode:'test', test_email} pour un test, POST {mode:'send', confirm:true} pour l'envoi de masse.",
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// POST — test (1 adresse) ou send (masse, confirm requis)
// ═══════════════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const mode = body?.mode;

  // Préconditions bloquantes : ne jamais annoncer un code mort ou une feature off.
  const pre = await checkPreconditions();
  if (!pre.ete30Active)     return NextResponse.json({ error: "ETE30 inactif ou expiré — envoi bloqué (l'email annonce ce code)." }, { status: 400 });
  if (!pre.parrainageActif) return NextResponse.json({ error: "Programme de parrainage désactivé — envoi bloqué (l'email l'annonce)." }, { status: 400 });

  const resend = new Resend(process.env.RESEND_API_KEY);

  // ── TEST : les 2 variantes à une seule adresse ────────────────────────────
  if (mode === "test") {
    const to = (typeof body.test_email === "string" && body.test_email.trim()) || ADMIN_EMAILS[0];
    if (!to) return NextResponse.json({ error: "test_email requis (aucun ADMIN_EMAIL_1)" }, { status: 400 });
    try {
      const { error } = await resend.batch.send([
        { from: FROM, to: [to], subject: `[TEST · avec compte] ${SUBJECT}`,  html: campaignHtml({ prenom: "Erika", hasAccount: true,  footer: footerHtml({ isNewsletter: false, token: null, email: to }) }), replyTo: "contact@milkbebe.fr" },
        { from: FROM, to: [to], subject: `[TEST · sans compte] ${SUBJECT}`, html: campaignHtml({ prenom: null,    hasAccount: false, footer: footerHtml({ isNewsletter: true,  token: null, email: to }) }), replyTo: "contact@milkbebe.fr" },
      ]);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, mode: "test", to, variants: ["avec_compte", "sans_compte"] });
    } catch (e: any) {
      return NextResponse.json({ error: e?.message ?? "Erreur envoi test" }, { status: 500 });
    }
  }

  // ── SEND : envoi de masse (confirm obligatoire) ───────────────────────────
  if (mode === "send") {
    if (body.confirm !== true) {
      return NextResponse.json({ error: "Envoi de masse : ajoute { confirm: true } pour confirmer." }, { status: 400 });
    }
    const recipients = await buildRecipients();
    if (recipients.length === 0) return NextResponse.json({ error: "Aucun destinataire" }, { status: 400 });

    // Générer les tokens manquants pour les abonnés newsletter (best-effort).
    for (const r of recipients) {
      if (r.isNewsletter && !r.token) {
        r.token = randomUUID();
        try { await supabaseServer.from("newsletter_subscribers").update({ unsubscribe_token: r.token }).eq("email", r.email); } catch {}
      }
    }

    const BATCH = 100;
    let sent = 0, failed = 0;
    for (let i = 0; i < recipients.length; i += BATCH) {
      const slice = recipients.slice(i, i + BATCH);
      const payloads = slice.map(r => ({
        from: FROM,
        to: [r.email],
        subject: SUBJECT,
        html: campaignHtml({ prenom: r.prenom, hasAccount: r.hasAccount, footer: footerHtml(r) }),
        replyTo: "contact@milkbebe.fr",
      }));
      try {
        const { error } = await resend.batch.send(payloads);
        if (error) failed += slice.length; else sent += slice.length;
      } catch { failed += slice.length; }
    }

    try {
      await supabaseServer.from("activity_log").insert([{
        type: "campaign_send",
        message: `Campagne « Nouveautés + Parrainage » : ${sent}/${recipients.length} OK`,
        meta: { sent, failed, total: recipients.length },
      }]);
    } catch {}

    return NextResponse.json({ ok: true, mode: "send", sent, failed, total: recipients.length });
  }

  return NextResponse.json({ error: "mode invalide — 'test' ou 'send'" }, { status: 400 });
}
