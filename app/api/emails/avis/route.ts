import { supabaseServer } from "@/lib/server/supabase";
import { Resend }         from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE   = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

export const dynamic = "force-dynamic";

// Cron J+7 — demande d'avis post-achat
// À ajouter dans vercel.json : { "path": "/api/emails/avis", "schedule": "0 10 * * *" }
export async function GET(req: Request) {
  const auth = (req as any).headers?.get?.("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }

  const now   = new Date();
  const j7min = new Date(now.getTime() - 8  * 24 * 60 * 60 * 1000); // J-8
  const j7max = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000); // J-7

  // Avis = 7 jours APRÈS LIVRAISON (pas après commande). Le client a eu le temps
  // d'utiliser le produit, donc son avis sera plus pertinent. On filtre sur
  // delivered_at entre J-8 et J-7. Les commandes sans delivered_at (anciennes
  // ou non livrées) ne reçoivent pas d'email avis.
  //
  // ⚠️ EXCLUSION OFFERT100 : les commandes "produit offert — campagne test"
  // ont déjà un avis seedé en DB (cf. scripts/seed-juliette-review.mjs).
  // Ne pas spammer ces destinataires avec une demande d'avis. Le cron
  // taille-suivante (J+45/J+75) reste actif pour ces commandes — elles
  // représentent une vraie opportunité de vente.
  const { data: orders } = await supabaseServer
    .from("orders")
    .select("id, customer_email, customer_name, items, delivered_at")
    .eq("shipping_status", "livree")
    .is("review_email_sent_at", null)
    .not("delivered_at", "is", null)
    // SQL 3-valued logic : `.neq("promo_code", "OFFERT100")` exclurait aussi
    // les NULL (la grande majorité des commandes). On utilise .or() pour
    // garder explicitement les NULL + exclure uniquement la valeur exacte.
    .or("promo_code.is.null,promo_code.neq.OFFERT100")
    .gte("delivered_at", j7min.toISOString())
    .lte("delivered_at", j7max.toISOString());

  if (!orders || orders.length === 0) {
    return Response.json({ ok: true, sent: 0 });
  }

  let sent = 0;

  for (const order of orders) {
    const items  = Array.isArray(order.items) ? order.items : [];
    const prenom = order.customer_name?.split(" ")[0] ?? "toi";

    // Lien de désabonnement : tokenisé si la cliente est abonnée à la newsletter,
    // sinon fallback générique (/contact). L'ancien lien ?email= tombait toujours
    // sur ?status=invalid car la route ne lit que ?token=.
    const { data: sub } = await supabaseServer
      .from("newsletter_subscribers")
      .select("unsubscribe_token")
      .eq("email", order.customer_email)
      .eq("active", true)
      .maybeSingle();
    const unsubUrl = sub?.unsubscribe_token
      ? `${BASE}/api/newsletter/unsubscribe?token=${sub.unsubscribe_token}`
      : `${BASE}/fr/contact`;

    // Construire les liens d'avis vers /avis (form tokenisé via order_id+email)
    const emailParam = encodeURIComponent(order.customer_email);
    const orderParam = encodeURIComponent(order.id);
    const productLinks = items.slice(0, 3).map((item: any) => {
      const pid = item.product_id ?? item.id ?? "";
      const pidParam = pid ? `&product_id=${encodeURIComponent(pid)}` : "";
      return `<a href="${BASE}/fr/avis?order_id=${orderParam}&email=${emailParam}${pidParam}"
        style="display:block;padding:12px 16px;margin-bottom:8px;background:#f5f0e8;border-radius:10px;text-decoration:none;color:#1a1410;font-weight:700;font-size:14px">
        ⭐ Donner mon avis sur ${item.name}
      </a>`;
    }).join("");

    const html = `
<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#1a1410;font-family:sans-serif">
<div style="max-width:500px;margin:0 auto;padding:40px 20px;text-align:center">
  <div style="background:#c49a4a;border-radius:12px;padding:12px 24px;display:inline-block;margin-bottom:28px">
    <span style="color:#1a1410;font-weight:950;font-size:22px">M!LK</span>
  </div>
  <h1 style="color:#f2ede6;font-size:20px;font-weight:950;margin:0 0 12px">
    ${prenom}, bébé est bien habillé ? 🌿
  </h1>
  <p style="color:rgba(242,237,230,0.6);font-size:15px;line-height:1.7;margin:0 0 24px">
    Cela fait 7 jours que tu as reçu ta commande M!LK. On espère que bébé adore le bambou !
    Ton avis aide les autres parents à choisir en confiance.
  </p>
  <div style="text-align:left;margin-bottom:28px">
    ${productLinks}
  </div>
  <p style="color:rgba(242,237,230,0.3);font-size:12px;line-height:1.7">
    Ça prend 30 secondes. Ça compte énormément pour nous.
  </p>
  <p style="color:rgba(242,237,230,0.2);font-size:11px;margin-top:24px">
    M!LK — Essentiels bébé en bambou premium<br>
    <a href="${unsubUrl}" style="color:rgba(242,237,230,0.2)">Se désabonner</a>
  </p>
</div>
</body>
</html>`;

    const { error } = await resend.emails.send({
      from:    "M!LK <contact@milkbebe.fr>",
      to:      order.customer_email,
      subject: `${prenom}, qu'est-ce que tu penses de ta commande M!LK ? ⭐`,
      html,
    });

    if (!error) {
      await supabaseServer
        .from("orders")
        .update({ review_email_sent_at: now.toISOString() })
        .eq("id", order.id);
      sent++;
    }
  }

  return Response.json({ ok: true, sent });
}