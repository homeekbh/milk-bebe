import { supabaseServer } from "@/lib/server/supabase";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE   = process.env.NEXT_PUBLIC_BASE_URL ?? "https://milk-bebe.vercel.app";

export async function GET() {
  try {
    const now   = new Date();
    const h1    = new Date(now.getTime() - 1  * 60 * 60 * 1000);
    const h24   = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const h72   = new Date(now.getTime() - 72 * 60 * 60 * 1000);

    const { data: carts } = await supabaseServer
      .from("abandoned_carts")
      .select("*")
      .eq("converted", false)
      .is("email_sent_at", null)
      .lte("created_at", h1.toISOString());

    if (!carts || carts.length === 0) return Response.json({ ok: true, sent: 0 });

    let sent = 0;

    for (const cart of carts) {
      const cartDate  = new Date(cart.created_at);
      const diffHours = (now.getTime() - cartDate.getTime()) / (1000 * 60 * 60);

      let subject = "";
      let html    = "";

      if (diffHours >= 1 && diffHours < 24) {
        subject = "Vous avez oublié quelque chose 🌿";
        html    = relanceHtml(cart, 1, null);
      } else if (diffHours >= 24 && diffHours < 72) {
        subject = "Votre panier M!LK vous attend — offre exclusive";
        html    = relanceHtml(cart, 2, cart.promo_code ?? null);
      } else if (diffHours >= 72) {
        subject = "Dernière chance — votre panier expire bientôt";
        html    = relanceHtml(cart, 3, null);
      }

      if (!subject) continue;

      const { error } = await resend.emails.send({
        from:    "M!LK <bonjour@milkbebe.fr>",
        to:      cart.email,
        subject,
        html,
      });

      if (!error) {
        await supabaseServer.from("abandoned_carts")
          .update({ email_sent_at: now.toISOString() })
          .eq("id", cart.id);
        sent++;
      }
    }

    return Response.json({ ok: true, sent });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

function relanceHtml(cart: any, step: number, promoCode: string | null): string {
  const items    = Array.isArray(cart.items) ? cart.items : [];
  const prenom   = cart.prenom ?? "";
  const total    = Number(cart.total ?? 0).toFixed(2);

  const itemsList = items.map((i: any) => `
    <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(242,237,230,0.06)">
      <span style="color:#f2ede6;font-weight:700;font-size:14px">${i.name}</span>
      <span style="color:#c49a4a;font-weight:900;font-size:14px">${(Number(i.price) * Number(i.quantity)).toFixed(2)} €</span>
    </div>
  `).join("");

  const messages: Record<number, { title: string; body: string }> = {
    1: {
      title: `${prenom ? `${prenom}, vous` : "Vous"} avez oublié votre panier 🌿`,
      body:  "Vos essentiels bébé en bambou vous attendent. Stock limité.",
    },
    2: {
      title: "Un petit coup de pouce pour finaliser ?",
      body:  promoCode
        ? `On vous offre un code promo pour vous aider à franchir le pas.`
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
    <div style="font-size:24px;font-weight:950;color:#c49a4a;font-family:monospace;letter-spacing:2px">${promoCode}</div>
  </div>` : ""}
  <a href="${BASE}/panier" style="display:block;text-align:center;background:#f2ede6;color:#1a1410;padding:16px;border-radius:12px;font-weight:900;font-size:15px;text-decoration:none;margin-bottom:20px">
    Finaliser ma commande →
  </a>
  <div style="text-align:center;font-size:11px;color:rgba(242,237,230,0.2);line-height:1.8">
    M!LK — Essentiels bébé en bambou premium<br>
    <a href="${BASE}/api/newsletter/unsubscribe?email=${cart.email}" style="color:rgba(242,237,230,0.2)">Se désabonner</a>
  </div>
</div>
</body>
</html>`;
}