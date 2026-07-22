import { supabaseServer } from "@/lib/server/supabase";
import { escapeHtml }     from "@/lib/escape-html";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE   = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

export const dynamic = "force-dynamic";
// Boucle d'envoi (relances panier abandonné) : fenêtre élargie pour ne pas timeouter à mi-liste.
export const maxDuration = 60;

export async function GET(req: Request) {
  const auth = (req as any).headers?.get?.("authorization");
  // Fail-closed : un CRON_SECRET absent/vide rejette TOUT (sinon « Bearer undefined » serait devinable).
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const now = new Date();
    const h1  = new Date(now.getTime() - 1  * 60 * 60 * 1000);  // 1h ago
    const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);  // 24h ago
    const h72 = new Date(now.getTime() - 72 * 60 * 60 * 1000);  // 72h ago

    // Récupérer TOUS les paniers non convertis
    const { data: carts, error: cartsErr } = await supabaseServer
      .from("abandoned_carts")
      .select("*")
      .eq("converted", false)
      .lte("created_at", h1.toISOString()); // au moins 1h

    // Erreur DB → NE PAS la masquer en « sent: 0 » (ferait croire au cron qu'il n'y a aucun panier
    // à relancer). On remonte l'échec pour qu'il soit visible dans le résultat du cron.
    if (cartsErr) {
      console.error("[emails:relance] lecture paniers abandonnés échouée:", cartsErr.message);
      return Response.json({ error: cartsErr.message }, { status: 500 });
    }
    if (!carts || carts.length === 0) return Response.json({ ok: true, sent: 0 });

    let sent = 0;

    for (const cart of carts) {
      const cartDate  = new Date(cart.created_at); // ✅ created_at — cohérent avec le filtre Supabase
      const diffHours = (now.getTime() - cartDate.getTime()) / (1000 * 60 * 60);

      // Lien de désabonnement tokenisé (même mécanisme que emails/avis) : ?token=<token de
      // l'abonné> si la cliente est abonnée active, sinon fallback /fr/contact. L'ancien
      // ?email= tombait TOUJOURS sur ?status=invalid (la route ne lit que ?token=).
      const { data: sub } = await supabaseServer
        .from("newsletter_subscribers")
        .select("unsubscribe_token")
        .eq("email", cart.email)
        .eq("active", true)
        .maybeSingle();
      const unsubUrl = sub?.unsubscribe_token
        ? `${BASE}/api/newsletter/unsubscribe?token=${sub.unsubscribe_token}`
        : `${BASE}/fr/contact`;

      // Relance 1 : fenêtre élargie à 48 h (au lieu de 24 h). Le cron tourne 1×/jour : une fenêtre
      // de 23 h laissait un angle mort — un panier créé < 1 h avant le run avait un âge < 1 h au
      // 1er passage (trop tôt) puis > 24 h au suivant (trop tard), et R2 exige relance_1 → il ne
      // recevait AUCUNE relance. Une fenêtre > intervalle du cron (24 h) supprime l'angle mort.
      if (diffHours >= 1 && diffHours < 48 && !cart.relance_1) {
        const { error } = await resend.emails.send({
          from:    "M!LK <contact@milkbebe.fr>",
          to:      cart.email,
          subject: "Vous avez oublié quelque chose 🌿",
          html:    relanceHtml(cart, 1, null, unsubUrl),
        });
        if (!error) {
          await supabaseServer.from("abandoned_carts")
            .update({ relance_1: true, email_sent_at: now.toISOString() })
            .eq("id", cart.id);
          sent++;
        }
        continue;
      }

      // Relance 2 : entre 24h et 72h, relance_1 envoyée, relance_2 pas encore
      if (diffHours >= 24 && diffHours < 72 && cart.relance_1 && !cart.relance_2) {
        const { error } = await resend.emails.send({
          from:    "M!LK <contact@milkbebe.fr>",
          to:      cart.email,
          subject: "Votre panier M!LK vous attend — offre exclusive",
          html:    relanceHtml(cart, 2, cart.promo_code ?? null, unsubUrl),
        });
        if (!error) {
          await supabaseServer.from("abandoned_carts")
            .update({ relance_2: true, email_sent_at: now.toISOString() })
            .eq("id", cart.id);
          sent++;
        }
        continue;
      }

      // Relance 3 : après 72h, relance_2 envoyée, relance_3 pas encore
      if (diffHours >= 72 && cart.relance_2 && !cart.relance_3) {
        const { error } = await resend.emails.send({
          from:    "M!LK <contact@milkbebe.fr>",
          to:      cart.email,
          subject: "Dernière chance — votre panier expire bientôt",
          html:    relanceHtml(cart, 3, null, unsubUrl),
        });
        if (!error) {
          await supabaseServer.from("abandoned_carts")
            .update({ relance_3: true, email_sent_at: now.toISOString() })
            .eq("id", cart.id);
          sent++;
        }
      }
    }

    return Response.json({ ok: true, sent });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

function relanceHtml(cart: any, step: number, promoCode: string | null, unsubUrl: string): string {
  const items  = Array.isArray(cart.items) ? cart.items : [];
  const prenom = cart.prenom ?? "";
  const total  = Number(cart.total ?? 0).toFixed(2);

  const itemsList = items.map((i: any) => `
    <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(242,237,230,0.06)">
      <span style="color:#f2ede6;font-weight:700;font-size:14px">${escapeHtml(i.name)}</span>
      <span style="color:#c49a4a;font-weight:900;font-size:14px">${(Number(i.price) * Number(i.quantity)).toFixed(2)} €</span>
    </div>
  `).join("");

  const messages: Record<number, { title: string; body: string }> = {
    1: {
      title: `${prenom ? `${escapeHtml(prenom)}, vous` : "Vous"} avez oublié votre panier 🌿`,
      body:  "Vos essentiels bébé en bambou vous attendent. Stock limité.",
    },
    2: {
      title: "Un petit coup de pouce pour finaliser ?",
      body:  promoCode
        ? "On vous offre un code promo pour vous aider à franchir le pas."
        : "Vos articles sont toujours disponibles. Ne les laissez pas partir.",
    },
    3: {
      title: "Dernière chance 🔥",
      body:  "Votre panier va expirer. Les stocks sont limités.",
    },
  };

  const msg = messages[step];

  return `
<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#1a1410;font-family:sans-serif">
<div style="max-width:520px;margin:0 auto;padding:40px 20px">
  <div style="text-align:center;margin-bottom:32px">
    <div style="display:inline-block;background:#c49a4a;border-radius:12px;padding:12px 24px">
      <span style="color:#1a1410;font-weight:950;font-size:20px">M!LK</span>
    </div>
  </div>
  <div style="background:#2a2018;border-radius:20px;border:1px solid rgba(242,237,230,0.08);padding:32px;margin-bottom:20px">
    <h2 style="margin:0 0 12px;color:#f2ede6;font-size:22px;font-weight:950">${msg.title}</h2>
    <p style="margin:0 0 24px;color:rgba(242,237,230,0.55);font-size:15px;line-height:1.7">${msg.body}</p>
    ${itemsList}
    <div style="margin-top:16px;text-align:right;font-size:20px;font-weight:950;color:#c49a4a">
      ${total} €
    </div>
  </div>
  ${promoCode ? `
  <div style="background:#2a2018;border-radius:16px;border:1px solid rgba(196,154,74,0.2);padding:20px;margin-bottom:20px;text-align:center">
    <div style="font-size:12px;color:rgba(242,237,230,0.4);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">Votre code promo</div>
    <div style="font-size:24px;font-weight:950;color:#c49a4a;font-family:monospace;letter-spacing:2px">${escapeHtml(String(promoCode ?? ""))}</div>
  </div>` : ""}
  <a href="${BASE}/fr/panier" style="display:block;text-align:center;background:#f2ede6;color:#1a1410;padding:16px;border-radius:12px;font-weight:900;font-size:15px;text-decoration:none;margin-bottom:20px">
    Finaliser ma commande →
  </a>
  <div style="text-align:center;font-size:11px;color:rgba(242,237,230,0.2);line-height:1.8">
    M!LK — Essentiels bébé en bambou premium<br>
    <a href="${unsubUrl}" style="color:rgba(242,237,230,0.2)">Se désabonner</a>
  </div>
</div>
</body>
</html>`;
}